import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  CheckCircle, AlertTriangle, XCircle, 
  Layers, Edit2, Trash2, Check, X, ShieldAlert 
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';

interface AqtaElement {
  id: string;
  discipline: string;
  element_type: string;
  properties: any;
  confidence_score: number;
  is_validated: boolean;
}

export default function AqtaReviewPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [elements, setElements] = useState<AqtaElement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchElements();
  }, [projectId]);

  const fetchElements = async () => {
    try {
      const { data, error } = await supabase
        .from('aqta_elements')
        .select('*')
        .eq('project_id', projectId)
        .order('confidence_score', { ascending: true });

      if (error) throw error;
      setElements(data || []);
    } catch (error) {
      console.error('Error fetching AQTA elements:', error);
      toast.error('Failed to load AQTA elements');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 95) return 'text-green-500 bg-green-500/10 border-green-500/20';
    if (score >= 80) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    return 'text-red-500 bg-red-500/10 border-red-500/20';
  };

  const getConfidenceIcon = (score: number) => {
    if (score >= 95) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (score >= 80) return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return <ShieldAlert className="w-4 h-4 text-red-500" />;
  };

  const handleApprove = async (elementId: string) => {
    try {
      const { error } = await supabase
        .from('aqta_elements')
        .update({ is_validated: true, confidence_score: 100 })
        .eq('id', elementId);

      if (error) throw error;
      toast.success('Element validated');
      fetchElements();
    } catch (error) {
      toast.error('Failed to validate element');
    }
  };

  const handleDelete = async (elementId: string) => {
    try {
      const { error } = await supabase
        .from('aqta_elements')
        .delete()
        .eq('id', elementId);

      if (error) throw error;
      toast.success('Element deleted');
      fetchElements();
    } catch (error) {
      toast.error('Failed to delete element');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Quantity Takeoff Review</h1>
          <p className="text-gray-400 mt-1">Review, edit, and approve elements detected by AQTA v1.0</p>
        </div>
        <Button onClick={() => navigate(`/projects/${projectId}/boq`)}>
          Proceed to BOQ
        </Button>
      </div>

      <div className="bg-space-900 border border-space-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-space-800/50 text-gray-400 text-sm">
                <th className="p-4 font-medium">Element</th>
                <th className="p-4 font-medium">Discipline</th>
                <th className="p-4 font-medium">Extracted Properties</th>
                <th className="p-4 font-medium">AI Confidence</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-space-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    Loading AQTA elements...
                  </td>
                </tr>
              ) : elements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 flex flex-col items-center">
                    <Layers className="w-12 h-12 text-space-700 mb-3" />
                    <p>No elements extracted yet.</p>
                  </td>
                </tr>
              ) : (
                elements.map((el) => (
                  <tr key={el.id} className="hover:bg-space-800/20 transition-colors">
                    <td className="p-4">
                      <span className="font-medium text-white capitalize">{el.element_type}</span>
                    </td>
                    <td className="p-4 capitalize text-gray-300">{el.discipline}</td>
                    <td className="p-4">
                      <div className="text-sm text-gray-400">
                        {el.properties ? JSON.stringify(el.properties) : 'No properties calculated'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-sm font-medium ${getConfidenceColor(el.confidence_score)}`}>
                        {getConfidenceIcon(el.confidence_score)}
                        {el.confidence_score}%
                      </div>
                    </td>
                    <td className="p-4">
                      {el.is_validated ? (
                        <span className="text-green-500 text-sm font-medium flex items-center gap-1">
                          <Check className="w-4 h-4" /> Approved
                        </span>
                      ) : (
                        <span className="text-yellow-500 text-sm font-medium flex items-center gap-1">
                          Pending Review
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!el.is_validated && (
                          <button
                            onClick={() => handleApprove(el.id)}
                            className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-500/10 rounded transition-colors"
                            title="Approve Element"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          className="p-1.5 text-gray-400 hover:text-cyan-500 hover:bg-cyan-500/10 rounded transition-colors"
                          title="Edit Properties"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(el.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                          title="Delete Element"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
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
