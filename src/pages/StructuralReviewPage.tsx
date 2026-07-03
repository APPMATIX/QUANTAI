import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import StructuralTable from '../components/review/StructuralTable';
import CommentsPanel from '../components/review/CommentsPanel';
import { CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { StructuralElement, Project } from '../types/app';

export default function StructuralReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [data, setData] = useState<StructuralElement[]>([]);
  const [filter, setFilter] = useState('All');
  const [saving, setSaving] = useState(false);
  const [activeComment, setActiveComment] = useState<{id: string, name: string} | null>(null);

  // Fetch project to ensure it exists
  useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Project;
    }
  });

  const { isLoading: dataLoading, refetch } = useQuery({
    queryKey: ['structural-elements', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('structural_elements')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      setData(data as StructuralElement[]);
      return data;
    }
  });

  // Debounced update to Supabase
  const handleUpdate = async (rowId: string, field: keyof StructuralElement, value: string | number) => {
    // Optimistic UI update
    setData(prev => prev.map(row => 
      row.id === rowId ? { ...row, [field]: value } : row
    ));

    try {
      const { error } = await supabase
        .from('structural_elements')
        .update({ [field]: value })
        .eq('id', rowId);
        
      if (error) throw error;
    } catch (err: any) {
      toast.error('Failed to save change');
      refetch(); // Revert on failure
    }
  };

  const handleDelete = async (rowId: string) => {
    setData(prev => prev.filter(row => row.id !== rowId));
    
    try {
      const { error } = await supabase.from('structural_elements').delete().eq('id', rowId);
      if (error) throw error;
      toast.success('Row deleted');
    } catch (err) {
      toast.error('Failed to delete row');
      refetch();
    }
  };

  const handleAdd = async () => {
    // Create a new dummy row
    const { data: newRow, error } = await supabase
      .from('structural_elements')
      .insert([{
        project_id: id,
        element: 'column',
        grid: '',
        length_m: 0,
        width_m: 0,
        depth_m: 0,
        quantity: 0,
        unit: 'm³',
        confidence: 'high',
        is_approved: false
      }])
      .select()
      .single();
      
    if (error) {
      toast.error('Failed to add row');
      return;
    }
    
    setData(prev => [...prev, newRow as StructuralElement]);
  };

  const handleApprove = async () => {
    setSaving(true);
    try {
      // Approve all structural rows for this project
      const { error } = await supabase
        .from('structural_elements')
        .update({ is_approved: true })
        .eq('project_id', id);
        
      if (error) throw error;
      
      toast.success('Structural takeoff approved');
      navigate(`/projects/${id}/architectural-review`);
    } catch (err) {
      toast.error('Failed to approve');
    } finally {
      setSaving(false);
    }
  };

  const filters = ['All', 'Footing', 'Column', 'Beam', 'Slab'];

  if (dataLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Structural Takeoff Review</h1>
          <p className="text-gray-400 text-sm mt-1">Review and edit AI-extracted structural quantities.</p>
        </div>
        <div className="flex items-center gap-4 bg-brand-surface p-1 rounded-lg border border-brand-border">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === f 
                  ? 'bg-brand-primary text-white shadow-sm' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card overflow-hidden relative">
        <StructuralTable 
          data={data} 
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onAdd={handleAdd}
          onComment={(id, name) => setActiveComment({ id, name })}
          filter={filter}
        />
        
        {activeComment && (
          <CommentsPanel 
            projectId={id as string}
            elementId={activeComment.id}
            elementType="structural"
            elementName={activeComment.name}
            onClose={() => setActiveComment(null)}
          />
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-brand-navy/90 backdrop-blur-md border-t border-brand-border p-4 z-20 flex justify-between items-center px-8">
        <div className="text-sm text-gray-400">
          <span className="text-white font-medium">{data.length}</span> items total
        </div>
        <button
          onClick={handleApprove}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
          Approve & Continue
        </button>
      </div>
    </div>
  );
}
