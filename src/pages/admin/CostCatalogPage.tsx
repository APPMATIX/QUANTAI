import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Plus, Trash2, Loader2, DollarSign, Search } from 'lucide-react';
import toast from 'react-hot-toast';

type CostItem = {
  id: string;
  category: 'structural' | 'architectural';
  item_name: string;
  unit_rate: number;
  unit: string;
  currency: string;
};

export default function CostCatalogPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  
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

  const activeCompanyId = isSuperAdmin ? selectedCompanyId : profile?.company_id;
  
  const [newItem, setNewItem] = useState<Partial<CostItem>>({
    category: 'structural',
    item_name: '',
    unit_rate: 0,
    unit: 'm3',
    currency: 'USD'
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ['cost-catalog', activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_catalog')
        .select('*')
        .eq('company_id', activeCompanyId)
        .order('category', { ascending: true })
        .order('item_name', { ascending: true });
        
      if (error) throw error;
      return data as CostItem[];
    }
  });

  const addItemMutation = useMutation({
    mutationFn: async (item: Partial<CostItem>) => {
      const { data, error } = await supabase
        .from('cost_catalog')
        .insert([{ ...item, company_id: activeCompanyId }])
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-catalog'] });
      toast.success('Cost item added successfully');
      setIsAdding(false);
      setNewItem({ category: 'structural', item_name: '', unit_rate: 0, unit: 'm3', currency: 'USD' });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add cost item');
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cost_catalog').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-catalog'] });
      toast.success('Cost item deleted');
    }
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId) {
      toast.error('Please select a company first');
      return;
    }
    if (!newItem.item_name || newItem.unit_rate === undefined || !newItem.unit) {
      toast.error('Please fill in all fields');
      return;
    }
    addItemMutation.mutate(newItem);
  };

  const filteredItems = items?.filter(item => 
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Cost Catalog</h1>
          <p className="text-gray-400">Manage standard unit rates for automated BoQ generation.</p>
        </div>
        <div className="flex items-center gap-4">
          {isSuperAdmin && (
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="bg-brand-navy border border-brand-border rounded-lg px-4 py-2 text-white outline-none focus:ring-1 focus:ring-brand-primary"
            >
              <option value="">Select a Company...</option>
              {companies?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button
            onClick={() => setIsAdding(!isAdding)}
            disabled={isSuperAdmin && !selectedCompanyId}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="glass-card p-6 border-brand-primary/50">
          <h2 className="text-lg font-medium text-white mb-4">Add New Cost Item</h2>
          <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value as any })}
                className="input-field"
              >
                <option value="structural">Structural</option>
                <option value="architectural">Architectural</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">Item Name</label>
              <input
                type="text"
                placeholder="e.g. Concrete Slab"
                value={newItem.item_name}
                onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Unit Rate</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItem.unit_rate}
                  onChange={(e) => setNewItem({ ...newItem, unit_rate: parseFloat(e.target.value) })}
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Unit</label>
              <input
                type="text"
                placeholder="m3, m2, linear meter"
                value={newItem.unit}
                onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div className="md:col-span-5 flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addItemMutation.isPending}
                className="btn-primary"
              >
                {addItemMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Item'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <div className="relative max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-gray-300">
              <tr>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Item Name</th>
                <th className="px-6 py-4 font-medium">Unit Rate</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-primary" />
                  </td>
                </tr>
              ) : filteredItems?.map((item) => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.category === 'structural' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
                    }`}>
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white font-medium">{item.item_name}</td>
                  <td className="px-6 py-4 text-gray-300">
                    {item.currency} {item.unit_rate.toFixed(2)} / {item.unit}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this cost item?')) {
                          deleteItemMutation.mutate(item.id);
                        }
                      }}
                      disabled={deleteItemMutation.isPending}
                      className="text-gray-400 hover:text-red-400 transition-colors p-2"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              
              {(!filteredItems || filteredItems.length === 0) && !isLoading && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No cost items found in catalog.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
