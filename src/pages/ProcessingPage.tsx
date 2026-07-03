import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { extractPdfPages } from '../lib/pdf';
import { runOcr } from '../lib/ocr';
import { analyzeDrawing } from '../lib/openai';
import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { QuantityResults } from '../lib/openai';

type Step = 'downloading' | 'converting-cad' | 'extracting' | 'ocr' | 'ai' | 'saving' | 'complete';

export default function ProcessingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const selectedDrawingId = searchParams.get('drawingId');
  
  const [currentStep, setCurrentStep] = useState<Step>('downloading');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const processingRef = useRef(false);

  useEffect(() => {
    if (processingRef.current) return;
    processingRef.current = true;
    
    startProcessing();
  }, [id]);

  const startProcessing = async () => {
    if (!id) return;
    
    try {
      // 1. Get ProjectFile record
      setCurrentStep('downloading');
      setProgress(10);
      
      let query = supabase.from('project_files').select('*').eq('project_id', id).eq('file_type', 'input');
      
      if (selectedDrawingId) {
        query = query.eq('id', selectedDrawingId);
      } else {
        query = query.order('created_at', { ascending: false }).limit(1);
      }
      
      const { data: files, error: dbError } = await query;
        
      if (dbError) throw dbError;
      if (!files || files.length === 0) throw new Error('No input file found for this project');
      
      const file = files[0] as any; // Using any for ProjectFile cast to avoid import issue for now

      // Update status
      await supabase.from('project_files').update({ status: 'processing' }).eq('id', file.id);
      await supabase.from('projects').update({ status: 'processing' }).eq('id', id);

      const isCad = file.file_name.toLowerCase().endsWith('.dwg') || file.file_name.toLowerCase().endsWith('.dxf');
      
      let fileUrl = '';

      if (isCad) {
        setCurrentStep('converting-cad');
        setProgress(20);
        
        const { data: signedUrlData, error: signedError } = await supabase.storage
          .from('drawings')
          .createSignedUrl(file.file_url, 3600);
          
        if (signedError || !signedUrlData) throw new Error('Could not generate secure URL for CAD file');

        const { data: convertData, error: convertError } = await supabase.functions.invoke('convert-cad', {
          body: { fileUrl: signedUrlData.signedUrl, fileName: file.file_name }
        });
        
        if (convertError) {
          console.error("Edge Function Error:", convertError);
          throw new Error(`CAD Conversion Edge Function Error: ${convertError.message || 'Unknown error'}`);
        }
        
        if (convertData?.error) {
          throw new Error(`CloudConvert Error: ${convertData.error}`);
        }
        
        if (!convertData?.pdfUrl) {
           throw new Error('CAD Conversion Failed: No PDF URL was returned by the conversion service.');
        }
        
        // Fetch the converted PDF so we can extract pages
        const pdfRes = await fetch(convertData.pdfUrl);
        const pdfBlob = await pdfRes.blob();
        fileUrl = URL.createObjectURL(pdfBlob);
      } else {
        // Normal PDF Download
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('drawings')
          .download(file.file_url);
          
        if (downloadError) throw downloadError;
        fileUrl = URL.createObjectURL(fileData);
      }
      
      // 2. Extract PDF Pages to Canvas/Images
      setCurrentStep('extracting');
      setProgress(30);
      // Increased from 3 to 10 for phase 1 scaling. A production system would chunk this.
      // Reverted to 3 because Edge Functions have a 150MB memory limit and 10 large base64 images causes 5xx errors.
      const base64Images = await extractPdfPages(fileUrl, 3); 
      URL.revokeObjectURL(fileUrl);
      
      if (base64Images.length === 0) throw new Error('Could not extract any images from PDF');

      // 3. Run OCR
      setCurrentStep('ocr');
      setProgress(50);
      const pagesPayload = [];
      
      for (let i = 0; i < base64Images.length; i++) {
        // Run OCR
        const text = await runOcr(base64Images[i]);
        
        // Upload image to Storage instead of sending base64 to Edge Function
        const fetchResponse = await fetch(base64Images[i]);
        const blob = await fetchResponse.blob();
        
        const filePath = `${file.id}/page_${i}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('drawings')
          .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });
          
        if (uploadError) throw uploadError;
        
        // Get Signed URL
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('drawings')
          .createSignedUrl(filePath, 3600);
          
        if (signedUrlError) throw signedUrlError;

        pagesPayload.push({
          imageUrl: signedUrlData.signedUrl,
          ocrText: text
        });
      }

      // 4. AI Analysis via Edge Function
      setCurrentStep('ai');
      setProgress(70);
      const results: QuantityResults = await analyzeDrawing({
        projectId: id,
        drawingId: file.id,
        pages: pagesPayload
      });

      // 5. Saving Results
      setCurrentStep('saving');
      setProgress(90);
      
      if (results.constants && results.constants.length > 0) {
        const constantsToInsert = results.constants.map((item: any) => ({
          ...item,
          project_id: id,
          file_id: file.id
        }));
        await supabase.from('boq_constants').insert(constantsToInsert);
      }

      if (results.items && results.items.length > 0) {
        const itemsToInsert = results.items.map((item: any) => ({
          ...item,
          amount: (item.quantity || 0) * (item.rate || 0), // Pre-calculate amount
          project_id: id,
          file_id: file.id
        }));
        await supabase.from('boq_items').insert(itemsToInsert);
      }

      // Mark complete
      await Promise.all([
        supabase.from('project_files').update({ status: 'completed' }).eq('id', file.id),
        supabase.from('projects').update({ status: 'completed' }).eq('id', id)
      ]);
      
      setCurrentStep('complete');
      setProgress(100);
      toast.success('AI Analysis complete');
      
      setTimeout(() => {
        navigate(`/projects/${id}/boq`);
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during processing');
      
      // Update status to failed
      await supabase.from('projects').update({ status: 'draft' }).eq('id', id);
    }
  };

  const steps = [
    { id: 'downloading', label: 'Downloading Document' },
    { id: 'converting-cad', label: 'Converting CAD to PDF (If Applicable)' },
    { id: 'extracting', label: 'Extracting PDF Pages' },
    { id: 'ocr', label: 'Running OCR Analysis' },
    { id: 'ai', label: 'AI Quantity Extraction' },
    { id: 'saving', label: 'Saving Results' }
  ];

  const getStepStatus = (stepId: string) => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    const stepIndex = steps.findIndex(s => s.id === stepId);
    
    if (currentStep === 'complete') return 'completed';
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Processing Failed</h2>
        <p className="text-gray-400 mb-6">{error}</p>
        <button
          onClick={() => navigate(`/projects/${id}/upload`)}
          className="px-6 py-2 bg-brand-primary text-white rounded-lg font-medium"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12">
      <div className="text-center mb-12">
        <h1 className="text-2xl font-bold text-white mb-2">Analyzing Drawing</h1>
        <p className="text-gray-400">Please wait while our AI processes the document. This usually takes 1-2 minutes.</p>
      </div>

      <div className="glass-card p-8 relative overflow-hidden">
        {/* Progress Bar background */}
        <div className="absolute top-0 left-0 w-full h-1 bg-brand-border">
          <div 
            className="h-full bg-brand-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="space-y-6 mt-4">
          {steps.map((step) => {
            const status = getStepStatus(step.id);
            return (
              <div key={step.id} className="flex items-center gap-4">
                {status === 'completed' ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : status === 'current' ? (
                  <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-600" />
                )}
                
                <span className={`text-lg font-medium transition-colors duration-300 ${
                  status === 'completed' ? 'text-gray-300' :
                  status === 'current' ? 'text-white' :
                  'text-gray-500'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
