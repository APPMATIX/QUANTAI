import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import DrawingUploader from '../components/drawings/DrawingUploader';
import { ArrowLeft, Loader2, FileText, Trash2, FileSpreadsheet, FileIcon, LayoutGrid, List, FileImage, Download, FileArchive, Settings } from 'lucide-react';
import type { Project, ProjectFile } from '../types/app';
import toast from 'react-hot-toast';

export default function ProjectFolderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);

  // 1. Fetch Project
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      return data as Project;
    }
  });

  // 2. Fetch Project Files
  const { data: files, isLoading: filesLoading, refetch } = useQuery({
    queryKey: ['project_files', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data as ProjectFile[];
    }
  });

  // 3. Delete File Mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const file = files?.find(f => f.id === fileId);
      if (file && file.file_type !== 'virtual_boq') {
        await supabase.storage.from('drawings').remove([file.file_url]);
      }
      const { error } = await supabase.from('project_files').delete().eq('id', fileId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('File deleted successfully');
      refetch();
    },
    onError: (err: any) => {
      toast.error('Failed to delete file: ' + err.message);
    }
  });

  // Action Handlers
  const handleUploadComplete = () => {
    setIsUploaderOpen(false);
    refetch();
  };

  const handleStartAnalysis = (fileId: string) => {
    navigate(`/projects/${id}/processing?drawingId=${fileId}`);
  };

  const getFileIcon = (fileName: string, fileType: string) => {
    if (fileType === 'virtual_boq') return <FileSpreadsheet className="text-green-400" />;
    
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return <FileText className="text-red-400" />;
      case 'dwg':
      case 'dxf': return <FileImage className="text-blue-400" />;
      case 'xlsx':
      case 'csv': return <FileSpreadsheet className="text-green-400" />;
      case 'zip': return <FileArchive className="text-yellow-400" />;
      case 'docx': return <FileText className="text-blue-500" />;
      default: return <FileIcon className="text-gray-400" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '--';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${mb.toFixed(2)} MB`;
  };

  if (projectLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
      </div>
    );
  }

  // Synthesize a virtual BOQ file if the project is completed, just for UX
  const displayFiles = [...(files || [])];
  if (project?.status === 'completed' && !displayFiles.some(f => f.file_type === 'virtual_boq')) {
    displayFiles.push({
      id: 'virtual-boq',
      project_id: id as string,
      file_name: 'Interactive_BOQ_Data.quantify',
      file_type: 'virtual_boq',
      file_size_bytes: 0,
      file_url: '',
      status: 'completed',
      created_at: new Date().toISOString()
    });
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link 
            to="/projects" 
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-brand-primary text-xl">📁</span> {project?.name}
            </h1>
            <p className="text-gray-400 text-sm mt-1">{project?.description || 'Project Files & Reports'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-black/20 rounded-lg p-1 border border-brand-border">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={() => setIsUploaderOpen(!isUploaderOpen)}
            className="px-4 py-2 bg-brand-primary text-white rounded-lg font-medium hover:bg-brand-primary/90 transition-colors"
          >
            Upload File
          </button>
        </div>
      </div>

      {/* Uploader Section */}
      {isUploaderOpen && (
        <div className="glass-card p-6 animate-in slide-in-from-top-4 fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-white">Upload New Files</h2>
            <button onClick={() => setIsUploaderOpen(false)} className="text-gray-400 hover:text-white text-sm">Cancel</button>
          </div>
          <DrawingUploader projectId={id as string} onUploadComplete={handleUploadComplete} />
        </div>
      )}

      {/* File Explorer */}
      <div className="glass-card flex flex-col min-h-[400px]">
        {filesLoading ? (
          <div className="flex-1 flex justify-center items-center">
            <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
          </div>
        ) : displayFiles.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 py-16">
            <div className="w-20 h-20 mb-4 opacity-20">📁</div>
            <p className="text-lg">This folder is empty</p>
            <p className="text-sm mt-1">Upload a drawing or PDF to get started</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="text-xs uppercase bg-black/20 border-b border-brand-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Size</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {displayFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-black/20 flex items-center justify-center">
                          {getFileIcon(file.file_name, file.file_type)}
                        </div>
                        <span className="font-medium text-white">{file.file_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{formatFileSize(file.file_size_bytes)}</td>
                    <td className="px-6 py-4 capitalize">{file.file_type.replace('_', ' ')}</td>
                    <td className="px-6 py-4">
                      {file.file_type === 'virtual_boq' ? (
                        <span className="text-green-400 text-xs font-medium px-2 py-1 bg-green-500/10 rounded-full border border-green-500/20">Ready</span>
                      ) : (
                        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${
                          file.status === 'completed' ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                          file.status === 'failed' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                          file.status === 'processing' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                          'text-blue-400 bg-blue-500/10 border-blue-500/20'
                        }`}>
                          {file.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {file.file_type === 'virtual_boq' ? (
                          <button 
                            onClick={() => navigate(`/projects/${id}/boq`)}
                            className="p-2 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary rounded transition-colors flex items-center gap-1"
                            title="Open BOQ Editor"
                          >
                            <FileSpreadsheet className="w-4 h-4" /> Open
                          </button>
                        ) : (
                          <>
                            {file.file_type === 'input' && file.status !== 'processing' && (
                              <button 
                                onClick={() => handleStartAnalysis(file.id)}
                                className="p-2 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary rounded transition-colors flex items-center gap-1"
                                title="Analyze Document"
                              >
                                <Settings className="w-4 h-4" /> Analyze
                              </button>
                            )}
                            {file.status === 'completed' && (
                              <>
                                <button 
                                  onClick={() => navigate(`/projects/${id}/aqta-review`)}
                                  className="p-2 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary rounded transition-colors flex items-center gap-1"
                                  title="AQTA Review"
                                >
                                  <Settings className="w-4 h-4" /> AQTA Review
                                </button>
                                <button 
                                  onClick={async () => {
                                    const { data } = await supabase.storage.from('drawings').createSignedUrl(file.file_url, 60);
                                    if (data) window.open(data.signedUrl, '_blank');
                                  }}
                                  className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded transition-colors"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button 
                              onClick={() => {
                                if (confirm(`Delete ${file.file_name}?`)) {
                                  deleteMutation.mutate(file.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {displayFiles.map((file) => (
              <div key={file.id} className="relative group border border-brand-border bg-black/20 hover:bg-white/5 hover:border-gray-600 rounded-xl p-4 flex flex-col items-center text-center transition-all cursor-pointer">
                
                {/* Status dot */}
                {file.file_type !== 'virtual_boq' && (
                   <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${
                    file.status === 'completed' ? 'bg-green-500' :
                    file.status === 'failed' ? 'bg-red-500' :
                    file.status === 'processing' ? 'bg-amber-500 animate-pulse' :
                    'bg-blue-500'
                  }`} title={`Status: ${file.status}`} />
                )}

                <div className="w-16 h-16 mb-3 flex items-center justify-center">
                  <div className="[&>svg]:w-12 [&>svg]:h-12">
                    {getFileIcon(file.file_name, file.file_type)}
                  </div>
                </div>
                
                <h3 className="text-sm font-medium text-white line-clamp-2 mb-1 w-full" title={file.file_name}>
                  {file.file_name}
                </h3>
                <p className="text-xs text-gray-500">
                  {file.file_type === 'virtual_boq' ? 'Interactive Data' : formatFileSize(file.file_size_bytes)}
                </p>

                {/* Hover actions overlay */}
                <div className="absolute inset-0 bg-black/80 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                  {file.file_type === 'virtual_boq' ? (
                    <button 
                      onClick={() => navigate(`/projects/${id}/boq`)}
                      className="px-4 py-1.5 bg-brand-primary text-white text-sm rounded-md hover:bg-brand-primary/90 flex items-center gap-2"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Open
                    </button>
                  ) : (
                    <>
                      {file.file_type === 'input' && file.status !== 'processing' && (
                        <button 
                          onClick={() => handleStartAnalysis(file.id)}
                          className="px-4 py-1.5 bg-brand-primary text-white text-sm rounded-md hover:bg-brand-primary/90 flex items-center gap-1 w-28 justify-center"
                        >
                          <Settings className="w-3.5 h-3.5" /> Analyze
                        </button>
                      )}
                      {file.status === 'completed' && (
                        <>
                          <button 
                            onClick={() => navigate(`/projects/${id}/aqta-review`)}
                            className="px-4 py-1.5 bg-brand-primary/20 text-brand-primary text-sm rounded-md hover:bg-brand-primary/30 w-28 flex justify-center items-center gap-1"
                          >
                            <Settings className="w-3.5 h-3.5" /> AQTA Review
                          </button>
                          <button 
                            onClick={async () => {
                              const { data } = await supabase.storage.from('drawings').createSignedUrl(file.file_url, 60);
                              if (data) window.open(data.signedUrl, '_blank');
                            }}
                            className="px-4 py-1.5 bg-white/10 text-white text-sm rounded-md hover:bg-white/20 w-28 flex justify-center items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" /> Download
                          </button>
                        </>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete ${file.file_name}?`)) deleteMutation.mutate(file.id);
                        }}
                        className="px-4 py-1.5 bg-red-500/20 text-red-400 text-sm rounded-md hover:bg-red-500/30 w-28 flex justify-center items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
