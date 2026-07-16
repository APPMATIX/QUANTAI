import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileType, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

interface DrawingUploaderProps {
  projectId: string;
  onUploadComplete: (drawingId: string) => void;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export default function DrawingUploader({ projectId, onUploadComplete }: DrawingUploaderProps) {
  const { profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File exceeds 100MB limit');
      return;
    }
    
    if (!file.name.toLowerCase().endsWith('.pdf') && 
        !file.name.toLowerCase().endsWith('.dwg') && 
        !file.name.toLowerCase().endsWith('.dxf')) {
      toast.error('Only PDF, DWG, and DXF files are supported');
      return;
    }

    if (!profile) return;

    setUploading(true);
    setProgress(10); // Fake progress to start

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `drawings/${profile.company_id}/${projectId}/${fileName}`;

      setProgress(40);

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('drawings')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      setProgress(80);

      // Create record in project_files table
      const { data, error: dbError } = await supabase
        .from('project_files')
        .insert([{
          project_id: projectId,
          company_id: profile?.company_id,
          file_url: filePath,
          file_name: file.name,
          file_size_bytes: file.size,
          status: 'pending',
          file_type: 'input'
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      setProgress(100);
      toast.success('Drawing uploaded successfully');
      onUploadComplete(data.id);

    } catch (error: any) {
      toast.error(error.message || 'Error uploading file');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [projectId, profile, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/vnd.dwg': ['.dwg'],
      'application/acad': ['.dwg'],
      'image/vnd.dxf': ['.dxf'],
      'text/plain': ['.dxf']
    },
    maxFiles: 1,
    disabled: uploading
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer
          ${isDragActive ? 'border-brand-primary bg-brand-primary/10' : 'border-brand-border hover:border-gray-500 hover:bg-white/5'}
          ${isDragReject ? 'border-red-500 bg-red-500/10' : ''}
          ${uploading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-2">
            {uploading ? (
              <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
            ) : isDragReject ? (
              <AlertCircle className="w-8 h-8 text-red-500" />
            ) : (
              <UploadCloud className="w-8 h-8 text-brand-primary" />
            )}
          </div>
          
          <div>
            <p className="text-lg font-medium text-white">
              {isDragActive ? "Drop the file here" : "Drag & drop PDF or CAD drawing"}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              or click to browse from your computer
            </p>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-4 bg-black/20 px-3 py-1.5 rounded-full">
            <FileType className="w-4 h-4" />
            <span>PDF, DWG, DXF up to 100MB</span>
          </div>
        </div>

        {uploading && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-brand-surface overflow-hidden rounded-b-xl">
            <div 
              className="h-full bg-brand-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
