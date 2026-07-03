import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { PlusSquare, Loader2, FolderOpen, Search, Trash2 } from 'lucide-react';
import type { Project } from '../types/app';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function ProjectListPage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  
  const { data: projects, isLoading, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data as Project[];
    }
  });

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
    
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete project: ' + error.message);
    } else {
      toast.success('Project deleted');
      refetch();
    }
  };

  const navigateToProject = (project: Project) => {
    navigate(`/projects/${project.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-gray-400 text-sm mt-1">Manage all your quantity takeoff projects.</p>
        </div>
        <Link 
          to="/projects/new"
          className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <PlusSquare className="w-5 h-5" />
          New Project
        </Link>
      </div>

      <div className="glass-card flex flex-col">
        <div className="p-4 border-b border-brand-border flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search projects..."
              className="block w-full pl-9 pr-3 py-2 border border-brand-border rounded-lg bg-black/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-xs text-gray-400 uppercase bg-black/20">
              <tr>
                <th className="px-6 py-4 font-medium">Project Name</th>
                <th className="px-6 py-4 font-medium">Client</th>
                <th className="px-6 py-4 font-medium">Location</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-brand-primary animate-spin mx-auto" />
                  </td>
                </tr>
              ) : projects?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <FolderOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 font-medium">No projects found</p>
                    <p className="text-gray-500 text-sm mt-1 mb-4">Get started by creating a new project.</p>
                    <Link 
                      to="/projects/new"
                      className="inline-flex items-center gap-2 text-brand-primary hover:text-brand-accent transition-colors"
                    >
                      <PlusSquare className="w-4 h-4" />
                      Create your first project
                    </Link>
                  </td>
                </tr>
              ) : (
                projects?.map((project) => (
                  <tr 
                    key={project.id} 
                    onClick={() => navigateToProject(project)}
                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{project.name}</div>
                      <div className="text-xs text-gray-500 mt-1 line-clamp-1">{project.description || 'No description'}</div>
                    </td>
                    <td className="px-6 py-4">{project.client || '-'}</td>
                    <td className="px-6 py-4">{project.location || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                        ${project.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                          project.status === 'processing' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                          'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateToProject(project);
                          }}
                          className="p-1.5 text-gray-400 hover:text-brand-primary bg-white/5 hover:bg-brand-primary/10 rounded-md transition-colors"
                          title="Open Folder"
                        >
                          <FolderOpen className="w-4 h-4" />
                        </button>
                      
                      {(role === 'admin' || role === 'super_admin') && (
                        <button 
                          onClick={(e) => handleDelete(project.id, e)}
                          className="p-1.5 text-gray-400 hover:text-red-400 bg-white/5 hover:bg-red-400/10 rounded-md transition-colors"
                          title="Delete Project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
