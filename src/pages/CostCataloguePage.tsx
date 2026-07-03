import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { DollarSign, Plus, Search, Edit2, Trash2, Loader2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import type { CostCatalogueItem } from '../types/app';

export default function CostCataloguePage() {
  const { profile, role } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CostCatalogueItem | null>(null);
  
  // Form Fields
  const [itemCode, setItemCode] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [rate, setRate] = useState('');
  const [category, setCategory] = useState('General');
  
  const categories = ['General', 'Substructure', 'Superstructure', 'Finishes', 'MEP', 'Site Works'];

  const { data: catalogue, isLoading } = useQuery({
    queryKey: ['cost_catalogue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_catalogue')
        .select('*')
        .order('item_code', { ascending: true });
        
      if (error) throw error;
      return data as CostCatalogueItem[];
    },
    enabled: !!profile?.company_id
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.company_id) throw new Error('Company ID not found');
      
      const payload = {
        company_id: profile.company_id,
        item_code: itemCode,
        description,
        unit,
        rate: parseFloat(rate),
        category
      };

      if (editingItem) {
        const { error } = await supabase
          .from('cost_catalogue')
          .update(payload)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cost_catalogue')
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingItem ? 'Item updated successfully' : 'Item added successfully');
      queryClient.invalidateQueries({ queryKey: ['cost_catalogue'] });
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error saving item');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cost_catalogue')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Item deleted');
      queryClient.invalidateQueries({ queryKey: ['cost_catalogue'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error deleting item');
    }
  });

  const openModal = (item?: CostCatalogueItem) => {
    if (item) {
      setEditingItem(item);
      setItemCode(item.item_code || '');
      setDescription(item.description);
      setUnit(item.unit);
      setRate(item.rate.toString());
      setCategory(item.category || 'General');
    } else {
      setEditingItem(null);
      setItemCode('');
      setDescription('');
      setUnit('');
      setRate('');
      setCategory('General');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  const filteredCatalogue = catalogue?.filter(item => {
    const matchesSearch = (item.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (item.item_code || '').toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const canEdit = role === 'admin' || role === 'super_admin';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-brand-primary" /> Cost Catalogue
          </h1>
          <p className="text-gray-400 text-sm mt-1">Manage standardized costs and rates for your company.</p>
        </div>
        
        {canEdit && (
          <button 
            onClick={() => openModal()}
            className="px-4 py-2 bg-brand-primary text-white rounded-lg font-medium hover:bg-brand-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by code or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-black/20 border border-brand-border rounded-lg text-white focus:outline-none focus:border-brand-primary"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
          <button
            onClick={() => setCategoryFilter('All')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              categoryFilter === 'All' ? 'bg-brand-primary text-white' : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                categoryFilter === cat ? 'bg-brand-primary text-white' : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-xs uppercase bg-black/20 border-b border-brand-border">
              <tr>
                <th className="px-6 py-4 font-medium w-32">Item Code</th>
                <th className="px-6 py-4 font-medium">Description</th>
                <th className="px-6 py-4 font-medium w-32">Category</th>
                <th className="px-6 py-4 font-medium w-24 text-center">Unit</th>
                <th className="px-6 py-4 font-medium w-32 text-right">Rate</th>
                {canEdit && <th className="px-6 py-4 font-medium w-24 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {isLoading ? (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-brand-primary animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredCatalogue?.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} className="px-6 py-12 text-center text-gray-500">
                    No items found in the cost catalogue.
                  </td>
                </tr>
              ) : (
                filteredCatalogue?.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 font-mono text-gray-300">{item.item_code || '-'}</td>
                    <td className="px-6 py-4 text-white">{item.description}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs rounded-md bg-white/5 border border-white/10 text-gray-300">
                        {item.category || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-300">{item.unit}</td>
                    <td className="px-6 py-4 text-right font-medium text-brand-primary">
                      ${item.rate.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    {canEdit && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openModal(item)}
                            className="p-1.5 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm('Delete this item?')) deleteMutation.mutate(item.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-brand-surface border border-brand-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-brand-border bg-black/20">
              <h2 className="text-lg font-bold text-white">
                {editingItem ? 'Edit Catalogue Item' : 'New Catalogue Item'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Item Code</label>
                  <input 
                    type="text" 
                    value={itemCode}
                    onChange={e => setItemCode(e.target.value)}
                    className="w-full px-3 py-2 bg-black/20 border border-brand-border rounded-lg text-white focus:border-brand-primary focus:outline-none"
                    placeholder="e.g. CON-01"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Category</label>
                  <select 
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-black/20 border border-brand-border rounded-lg text-white focus:border-brand-primary focus:outline-none [&>option]:bg-brand-surface"
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Description <span className="text-red-400">*</span></label>
                <textarea 
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-black/20 border border-brand-border rounded-lg text-white focus:border-brand-primary focus:outline-none min-h-[80px]"
                  placeholder="Detailed description of the item"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Unit <span className="text-red-400">*</span></label>
                  <input 
                    required
                    type="text" 
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-black/20 border border-brand-border rounded-lg text-white focus:border-brand-primary focus:outline-none"
                    placeholder="m3, kg, m2..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Rate <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      min="0"
                      value={rate}
                      onChange={e => setRate(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-black/20 border border-brand-border rounded-lg text-white focus:border-brand-primary focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-brand-border">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saveMutation.isPending}
                  className="px-4 py-2 bg-brand-primary text-white rounded-lg font-medium hover:bg-brand-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingItem ? 'Update Item' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
