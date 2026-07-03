import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProjectForm() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    client: '',
    location: '',
    description: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setLoading(true);

    const { data, error } = await supabase
      .from('projects')
      .insert([
        {
          name: formData.name,
          client: formData.client,
          location: formData.location,
          description: formData.description,
          status: 'draft',
          company_id: profile.company_id,
          created_by: profile.id
        }
      ])
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast.error('Failed to create project: ' + error.message);
    } else if (data) {
      toast.success('Project created successfully');
      navigate(`/projects/${data.id}/upload`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Project Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          name="name"
          required
          value={formData.name}
          onChange={handleChange}
          className="block w-full px-4 py-2 border border-brand-border rounded-lg bg-black/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          placeholder="e.g. Skyline Tower Phase 1"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Client Name</label>
        <input
          type="text"
          name="client"
          value={formData.client}
          onChange={handleChange}
          className="block w-full px-4 py-2 border border-brand-border rounded-lg bg-black/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          placeholder="e.g. Acme Corp"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleChange}
          className="block w-full px-4 py-2 border border-brand-border rounded-lg bg-black/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          placeholder="e.g. New York, NY"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          className="block w-full px-4 py-2 border border-brand-border rounded-lg bg-black/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
          placeholder="Brief details about this project..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-brand-border">
        <button
          type="button"
          onClick={() => navigate('/projects')}
          className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !formData.name}
          className="flex items-center gap-2 px-6 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Create Project
        </button>
      </div>
    </form>
  );
}
