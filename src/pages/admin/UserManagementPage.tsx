import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Users, UserPlus, Shield, Loader2, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UserManagementPage() {
  const { profile } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  
  const [newUser, setNewUser] = useState({
    name: '', email: '', role: 'user', company_id: '',
    username: '', department: '', designation: '', status: 'active', password: ''
  });

  const isSuperAdmin = profile?.role === 'super_admin';

  // Fetch Companies for Super Admin
  const { data: companies } = useQuery({
    queryKey: ['companies-list'],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('id, name').order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch Users
  const { data: users, isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['users', isSuperAdmin ? selectedCompanyId : profile?.company_id],
    enabled: !!profile,
    queryFn: async () => {
      let query = supabase.from('users').select('*, companies(name)').order('created_at', { ascending: false });
      
      if (!isSuperAdmin) {
        query = query.eq('company_id', profile?.company_id);
      } else if (selectedCompanyId !== 'all') {
        query = query.eq('company_id', selectedCompanyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetCompanyId = isSuperAdmin ? newUser.company_id : profile?.company_id;
    
    if (!targetCompanyId || !newUser.name || !newUser.email) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: functionError } = await supabase.functions.invoke('create-user', {
        body: {
          ...newUser,
          company_id: targetCompanyId
        }
      });

      if (functionError) throw new Error('Failed to provision user.');

      toast.success('User invited successfully');
      setIsAdding(false);
      setNewUser({ name: '', email: '', role: 'user', company_id: '', username: '', department: '', designation: '', status: 'active', password: '' });
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('users').update({ status: newStatus }).eq('id', userId);
      if (error) throw error;
      toast.success('Status updated');
      refetch();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

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
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-gray-400 text-sm mt-1">Manage users, roles, and access controls.</p>
        </div>
        <div className="flex items-center gap-4">
          {isSuperAdmin && (
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="bg-brand-navy border border-brand-border rounded-lg px-4 py-2 text-white outline-none focus:ring-1 focus:ring-brand-primary"
            >
              <option value="all">All Companies</option>
              {companies?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg font-medium transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              Add User
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="glass-card p-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white">Provision New User</h2>
            <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleAddUser} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Full Name *</label>
                <input type="text" required value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email *</label>
                <input type="email" required value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
                <input type="text" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
                <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2 text-white">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                </select>
              </div>
              {isSuperAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Company *</label>
                  <select required value={newUser.company_id} onChange={e => setNewUser({ ...newUser, company_id: e.target.value })} className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2 text-white">
                    <option value="">Select Company...</option>
                    {companies?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Department</label>
                <input type="text" value={newUser.department} onChange={e => setNewUser({ ...newUser, department: e.target.value })} className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Designation</label>
                <input type="text" value={newUser.designation} onChange={e => setNewUser({ ...newUser, designation: e.target.value })} className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Initial Password (Optional)</label>
                <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2 text-white" placeholder="Leave blank to send invite" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Provision User'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="text-xs text-gray-400 uppercase bg-black/20 border-b border-brand-border">
            <tr>
              <th className="px-6 py-4 font-medium">User Details</th>
              <th className="px-6 py-4 font-medium">Role & Org</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {users?.map((u) => (
              <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-bold">
                      {u.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="font-medium text-white">{u.name || 'No Name'} {u.username ? `(@${u.username})` : ''}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    {u.role === 'admin' || u.role === 'super_admin' ? <Shield className="w-4 h-4 text-brand-primary" /> : null}
                    <span className="capitalize text-white">{u.role.replace('_', ' ')}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {isSuperAdmin && u.companies ? u.companies.name : (u.designation || 'No Designation')}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {(profile?.role === 'admin' || isSuperAdmin) && u.id !== profile?.id ? (
                    <select
                      value={u.status}
                      onChange={(e) => handleUpdateStatus(u.id, e.target.value)}
                      className={`bg-brand-navy border border-brand-border rounded px-2 py-1 text-xs font-medium focus:outline-none ${u.status === 'active' ? 'text-green-400' : 'text-red-400'}`}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  ) : (
                    <span className={`px-2.5 py-1 rounded-full border text-xs font-medium ${u.status === 'active' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                      {u.status || 'active'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {u.id !== profile?.id && (
                    <button className="text-gray-500 hover:text-red-400 p-2 rounded hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            
            {(!users || users.length === 0) && !queryError && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No users found matching criteria.</p>
                </td>
              </tr>
            )}
            {queryError && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-red-500">
                  <p>Error loading users: {(queryError as Error).message}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
