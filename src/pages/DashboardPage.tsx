import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { FolderOpen, Loader2, PlusSquare, FileText, CheckCircle2, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { Project } from '../types/app';

import { useAuth } from '../hooks/useAuth';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { company } = useAuth();
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [
        { count: totalProjects },
        { count: processingProjects },
        { count: completedProjects },
        { count: totalDrawings }
      ] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('project_files').select('*', { count: 'exact', head: true }).eq('file_type', 'input')
      ]);

      return {
        totalProjects: totalProjects || 0,
        processingProjects: processingProjects || 0,
        completedProjects: completedProjects || 0,
        totalDrawings: totalDrawings || 0
      };
    }
  });

  const { data: recentProjects, isLoading: projectsLoading } = useQuery({
    queryKey: ['recent-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (error) throw error;
      return data as Project[];
    }
  });

  const statCards = [
    { name: 'Total Projects', value: stats?.totalProjects || 0, icon: FolderOpen, color: 'text-blue-400' },
    { name: 'Processing', value: stats?.processingProjects || 0, icon: Clock, color: 'text-amber-400' },
    { name: 'Completed', value: stats?.completedProjects || 0, icon: CheckCircle2, color: 'text-green-400' },
    { name: 'Drawings Uploaded', value: stats?.totalDrawings || 0, icon: FileText, color: 'text-purple-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          {company?.logo_url && (
            <div className="w-12 h-12 rounded-lg bg-white overflow-hidden flex items-center justify-center p-1 border border-brand-border shadow-lg">
              <img src={company.logo_url} alt={company.name} className="max-w-full max-h-full object-contain" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">
              {company?.name ? `${company.name} Dashboard` : 'Dashboard'}
            </h1>
            <p className="text-gray-400 text-sm mt-1">Overview of your quantity takeoff projects.</p>
          </div>
        </div>
        <Link 
          to="/projects/new"
          className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <PlusSquare className="w-5 h-5" />
          New Project
        </Link>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-6 flex items-center justify-center h-32 animate-pulse">
              <div className="w-8 h-8 bg-white/10 rounded-full"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <div key={stat.name} className="glass-card p-6 flex items-center gap-4 group hover:bg-white/5 transition-colors">
              <div className={`p-3 rounded-xl bg-white/5 border border-white/10 ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">{stat.name}</p>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-brand-border flex justify-between items-center">
          <h2 className="text-lg font-medium text-white">Recent Projects</h2>
          <Link to="/projects" className="text-sm text-brand-primary hover:text-brand-accent transition-colors">
            View All
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-xs text-gray-400 uppercase bg-black/20">
              <tr>
                <th className="px-6 py-3 font-medium">Project Name</th>
                <th className="px-6 py-3 font-medium">Client</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {projectsLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center">
                    <Loader2 className="w-6 h-6 text-brand-primary animate-spin mx-auto" />
                  </td>
                </tr>
              ) : recentProjects?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No projects found. Create your first project to get started.
                  </td>
                </tr>
              ) : (
                recentProjects?.map((project) => (
                  <tr 
                    key={project.id} 
                    className="hover:bg-white/5 transition-colors cursor-pointer" 
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <td className="px-6 py-4 font-medium text-white">{project.name}</td>
                    <td className="px-6 py-4">{project.client || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                        ${project.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                          project.status === 'processing' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                          'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {new Date(project.created_at).toLocaleDateString()}
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
