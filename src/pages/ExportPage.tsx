import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { generateExcel, generateCSV } from '../lib/export';
import { Download, FileSpreadsheet, Loader2, ArrowLeft, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import type { Project, StructuralElement, ArchitecturalElement } from '../types/app';

export default function ExportPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Project;
    }
  });

  const { data: structural, isLoading: structLoading } = useQuery({
    queryKey: ['structural-elements', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('structural_elements').select('*').eq('project_id', id);
      if (error) throw error;
      return data as StructuralElement[];
    }
  });

  const { data: architectural, isLoading: archLoading } = useQuery({
    queryKey: ['arch-elements', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('architectural_elements').select('*').eq('project_id', id);
      if (error) throw error;
      return data as ArchitecturalElement[];
    }
  });

  const handleExcelExport = async () => {
    if (!project || !structural || !architectural) return;
    setExporting(true);
    
    try {
      generateExcel(project, structural, architectural);
      
      // Log export
      await supabase.from('exports').insert([{
        project_id: project.id,
        export_type: 'excel',
        created_by: user?.id
      }]);
      
      toast.success('Excel exported successfully');
    } catch (error) {
      toast.error('Failed to export Excel');
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  const handleCSVExport = async (type: 'structural' | 'architectural') => {
    if (!project || !structural || !architectural) return;
    setExporting(true);
    
    try {
      generateCSV(project, structural, architectural, type);
      
      // Log export
      await supabase.from('exports').insert([{
        project_id: project.id,
        export_type: 'csv',
        created_by: user?.id
      }]);
      
      toast.success('CSV exported successfully');
    } catch (error) {
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const isLoading = projectLoading || structLoading || archLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          to={`/projects/${id}/architectural-review`}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Export Quantities</h1>
          <p className="text-gray-400 text-sm mt-1">Download your Bills of Quantities (BoQ) for <span className="text-white font-medium">{project?.name}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* Full Excel Export */}
        <div className="glass-card p-8 flex flex-col items-center text-center group hover:bg-white/5 transition-colors">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <FileSpreadsheet className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Full BoQ (Excel)</h2>
          <p className="text-gray-400 text-sm mb-8">
            Complete Bill of Quantities containing both structural and architectural sheets, formatted for professional use.
          </p>
          
          <button
            onClick={handleExcelExport}
            disabled={exporting}
            className="w-full mt-auto flex items-center justify-center gap-2 px-6 py-3 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            Download .xlsx
          </button>
        </div>

        {/* CSV Exports */}
        <div className="glass-card p-8 flex flex-col">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
              <Database className="w-8 h-8 text-brand-primary" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Raw Data (CSV)</h2>
            <p className="text-gray-400 text-sm">
              Export flat CSV files for importing into ERP systems or estimating software.
            </p>
          </div>

          <div className="space-y-4 mt-auto">
            <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-brand-border">
              <div>
                <p className="text-white font-medium">Structural</p>
                <p className="text-xs text-gray-400">{structural?.length || 0} items</p>
              </div>
              <button
                onClick={() => handleCSVExport('structural')}
                disabled={exporting || !structural?.length}
                className="p-2 text-brand-primary hover:bg-brand-primary/10 rounded transition-colors disabled:opacity-50"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-brand-border">
              <div>
                <p className="text-white font-medium">Architectural</p>
                <p className="text-xs text-gray-400">{architectural?.length || 0} items</p>
              </div>
              <button
                onClick={() => handleCSVExport('architectural')}
                disabled={exporting || !architectural?.length}
                className="p-2 text-brand-primary hover:bg-brand-primary/10 rounded transition-colors disabled:opacity-50"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
