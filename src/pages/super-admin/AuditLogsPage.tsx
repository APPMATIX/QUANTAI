import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { FileText, Loader2, Search, Filter } from 'lucide-react';

export default function AuditLogsPage() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', profile?.company_id, profile?.role],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          users:user_id (name, email),
          companies:company_id (name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (profile?.role !== 'super_admin') {
        query = query.eq('company_id', profile?.company_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const filteredLogs = logs?.filter(log => {
    const matchesSearch = 
      log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.users?.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesAction = filterAction === 'ALL' || log.action === filterAction;
    
    return matchesSearch && matchesAction;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
          <p className="text-gray-400 text-sm mt-1">Track system activity and user actions.</p>
        </div>
      </div>

      <div className="glass-card p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by entity, action, or user email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-brand-navy border border-brand-border rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="bg-brand-navy border border-brand-border rounded-lg px-4 py-2 text-white focus:outline-none"
          >
            <option value="ALL">All Actions</option>
            <option value="INSERT">Create (INSERT)</option>
            <option value="UPDATE">Update (UPDATE)</option>
            <option value="DELETE">Delete (DELETE)</option>
          </select>
        </div>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="text-xs text-gray-400 uppercase bg-black/20 border-b border-brand-border">
            <tr>
              <th className="px-6 py-4 font-medium">Timestamp</th>
              <th className="px-6 py-4 font-medium">User</th>
              <th className="px-6 py-4 font-medium">Action</th>
              <th className="px-6 py-4 font-medium">Entity</th>
              <th className="px-6 py-4 font-medium">Company</th>
              <th className="px-6 py-4 font-medium text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {filteredLogs?.map((log: any) => (
              <tr key={log.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-white">{log.users?.name || 'System'}</div>
                  <div className="text-xs text-gray-500">{log.users?.email}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full border text-xs font-medium uppercase
                    ${log.action === 'INSERT' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 
                      log.action === 'UPDATE' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 
                      'bg-red-500/10 border-red-500/20 text-red-400'}`}
                  >
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-white capitalize">{log.entity_type}</div>
                  <div className="text-xs text-gray-500 font-mono truncate max-w-[150px]" title={log.entity_id}>
                    {log.entity_id}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-400">
                  {log.companies?.name || 'N/A'}
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => alert(JSON.stringify(log.details, null, 2))}
                    className="text-brand-accent hover:underline text-xs"
                  >
                    View JSON
                  </button>
                </td>
              </tr>
            ))}
            {filteredLogs?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No audit logs found.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
