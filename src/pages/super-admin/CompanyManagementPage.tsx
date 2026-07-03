import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Building2, Plus, Loader2, Edit3, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CompanyManagementPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  
  // Form State
  const [company, setCompany] = useState({
    name: '', company_code: '', contact_person: '', email: '',
    mobile_number: '', address: '', country: '', state: '', city: '',
    time_zone: '', subscription_plan: 'basic', subscription_start_date: '',
    subscription_expiry_date: '', max_users: 10, status: 'active'
  });
  
  const [admin, setAdmin] = useState({
    name: '', email: '', mobile_number: '', username: '', password: ''
  });

  const { data: companies, isLoading, refetch } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data;
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.name || !company.company_code || (!editingCompanyId && !admin.email)) {
      toast.error('Please fill required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const companyPayload = { ...company };
      if (companyPayload.subscription_start_date === '') {
        delete (companyPayload as any).subscription_start_date;
      }
      if (companyPayload.subscription_expiry_date === '') {
        delete (companyPayload as any).subscription_expiry_date;
      }

      if (editingCompanyId) {
        // Update existing company
        const { error: updateError } = await supabase
          .from('companies')
          .update(companyPayload)
          .eq('id', editingCompanyId);
          
        if (updateError) throw updateError;
        toast.success('Company updated successfully');
      } else {
        // Create new company
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .insert([companyPayload])
          .select()
          .single();
          
        if (companyError) throw companyError;

        // Provision Admin User via Edge Function
        const { error: functionError } = await supabase.functions.invoke('create-user', {
          body: {
            email: admin.email,
            name: admin.name,
            username: admin.username,
            mobile_number: admin.mobile_number,
            password: admin.password,
            role: 'admin',
            company_id: companyData.id
          }
        });

        if (functionError) {
          await supabase.from('companies').delete().eq('id', companyData.id);
          throw new Error('Failed to provision admin. Company creation rolled back.');
        }
        toast.success('Company and Administrator created successfully');
      }

      closeForm();
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save company');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (comp: any) => {
    setCompany({
      name: comp.name || '',
      company_code: comp.company_code || '',
      contact_person: comp.contact_person || '',
      email: comp.email || '',
      mobile_number: comp.mobile_number || '',
      address: comp.address || '',
      country: comp.country || '',
      state: comp.state || '',
      city: comp.city || '',
      time_zone: comp.time_zone || '',
      subscription_plan: comp.subscription_plan || 'basic',
      subscription_start_date: comp.subscription_start_date ? comp.subscription_start_date.split('T')[0] : '',
      subscription_expiry_date: comp.subscription_expiry_date ? comp.subscription_expiry_date.split('T')[0] : '',
      max_users: comp.max_users || 10,
      status: comp.status || 'active'
    });
    setEditingCompanyId(comp.id);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingCompanyId(null);
    setCompany({
      name: '', company_code: '', contact_person: '', email: '',
      mobile_number: '', address: '', country: '', state: '', city: '',
      time_zone: '', subscription_plan: 'basic', subscription_start_date: '',
      subscription_expiry_date: '', max_users: 10, status: 'active'
    });
    setAdmin({
      name: '', email: '', mobile_number: '', username: '', password: ''
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This will delete all projects and data for this company.')) return;
    
    try {
      const { error } = await supabase.from('companies').delete().eq('id', id);
      if (error) throw error;
      toast.success('Company deleted');
      refetch();
    } catch (err) {
      toast.error('Failed to delete company');
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
          <h1 className="text-2xl font-bold text-white">Company Management</h1>
          <p className="text-gray-400 text-sm mt-1">Super Admin dashboard to manage tenant companies.</p>
        </div>
        {!isFormOpen && (
          <button
            onClick={() => {
              closeForm();
              setIsFormOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Company
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="glass-card p-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white">
              {editingCompanyId ? 'Edit Company' : 'Create New Company'}
            </h2>
            <button onClick={closeForm} className="text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Company Details Section */}
            <div>
              <h3 className="text-lg font-semibold text-brand-secondary mb-4">1. Company Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Company Name *</label>
                  <input type="text" required value={company.name} onChange={e => setCompany({...company, name: e.target.value})} className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Company Code *</label>
                  <input type="text" required value={company.company_code} onChange={e => setCompany({...company, company_code: e.target.value})} className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                  <select value={company.status} onChange={e => setCompany({...company, status: e.target.value})} className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2 text-white">
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Contact Person</label>
                  <input type="text" value={company.contact_person} onChange={e => setCompany({...company, contact_person: e.target.value})} className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Contact Email</label>
                  <input type="email" value={company.email} onChange={e => setCompany({...company, email: e.target.value})} className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Mobile Number</label>
                  <input type="text" value={company.mobile_number} onChange={e => setCompany({...company, mobile_number: e.target.value})} className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Country</label>
                  <input type="text" value={company.country} onChange={e => setCompany({...company, country: e.target.value})} className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">City</label>
                  <input type="text" value={company.city} onChange={e => setCompany({...company, city: e.target.value})} className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Max Users</label>
                  <input type="number" value={company.max_users} onChange={e => setCompany({...company, max_users: parseInt(e.target.value)})} className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2 text-white" />
                </div>
              </div>
            </div>

            {/* Admin Details Section (Only for Create) */}
            {!editingCompanyId && (
              <div>
                <h3 className="text-lg font-semibold text-brand-secondary mb-4">2. Initial Company Administrator</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Admin Name *</label>
                    <input type="text" required value={admin.name} onChange={e => setAdmin({...admin, name: e.target.value})} className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2 text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Admin Email *</label>
                    <input type="email" required value={admin.email} onChange={e => setAdmin({...admin, email: e.target.value})} className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2 text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
                    <input type="text" value={admin.username} onChange={e => setAdmin({...admin, username: e.target.value})} className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2 text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Admin Password (Optional)</label>
                    <input type="password" value={admin.password} onChange={e => setAdmin({...admin, password: e.target.value})} className="w-full bg-brand-navy border border-brand-border rounded-lg px-4 py-2 text-white" placeholder="Leave blank to send invite" />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button type="button" onClick={closeForm} className="px-6 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingCompanyId ? 'Save Changes' : 'Create Company & Admin')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies?.map((comp: any) => (
          <div key={comp.id} className="glass-card p-6 flex flex-col group hover:border-brand-primary/50 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-brand-primary/10 rounded-lg">
                <Building2 className="w-6 h-6 text-brand-primary" />
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEdit(comp)}
                  className="p-1.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(comp.id)}
                  className="p-1.5 text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/20 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-white truncate">{comp.name}</h3>
            <p className="text-sm text-gray-400 mt-1">Code: {comp.company_code || 'N/A'}</p>
            
            <div className="mt-4 pt-4 border-t border-brand-border flex justify-between items-center text-sm">
              <span className={`px-2 py-1 rounded text-xs font-medium ${comp.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {comp.status?.toUpperCase() || 'ACTIVE'}
              </span>
              <span 
                className="text-brand-accent cursor-pointer hover:underline"
                onClick={() => setSelectedCompany(comp)}
              >
                View Details
              </span>
            </div>
          </div>
        ))}
        
        {companies?.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 glass-card">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No companies found in the system.</p>
          </div>
        )}
      </div>

      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-brand-surface border border-brand-border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-primary" />
                {selectedCompany.name} Details
              </h2>
              <button onClick={() => setSelectedCompany(null)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Company Info</h4>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-300"><span className="text-gray-400 inline-block w-20">Code:</span> {selectedCompany.company_code || 'N/A'}</p>
                    <p className="text-sm text-gray-300"><span className="text-gray-400 inline-block w-20">Status:</span> <span className="capitalize">{selectedCompany.status}</span></p>
                    <p className="text-sm text-gray-300"><span className="text-gray-400 inline-block w-20">Created:</span> {new Date(selectedCompany.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-6">Contact</h4>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-300"><span className="text-gray-400 inline-block w-20">Person:</span> {selectedCompany.contact_person || 'N/A'}</p>
                    <p className="text-sm text-gray-300"><span className="text-gray-400 inline-block w-20">Email:</span> {selectedCompany.email || 'N/A'}</p>
                    <p className="text-sm text-gray-300"><span className="text-gray-400 inline-block w-20">Phone:</span> {selectedCompany.mobile_number || 'N/A'}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Location</h4>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-300"><span className="text-gray-400 inline-block w-24">Address:</span> {selectedCompany.address || 'N/A'}</p>
                    <p className="text-sm text-gray-300"><span className="text-gray-400 inline-block w-24">City:</span> {selectedCompany.city || 'N/A'}</p>
                    <p className="text-sm text-gray-300"><span className="text-gray-400 inline-block w-24">State/Country:</span> {selectedCompany.state || 'N/A'} {selectedCompany.country && `, ${selectedCompany.country}`}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-6">Subscription</h4>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-300"><span className="text-gray-400 inline-block w-24">Plan:</span> <span className="capitalize">{selectedCompany.subscription_plan || 'N/A'}</span></p>
                    <p className="text-sm text-gray-300"><span className="text-gray-400 inline-block w-24">Max Users:</span> {selectedCompany.max_users}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end">
              <button onClick={() => setSelectedCompany(null)} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
