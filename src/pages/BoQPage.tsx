import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Loader2, ArrowLeft, FileSpreadsheet, Calculator } from 'lucide-react';
import { generateBoQExcel } from '../lib/export';

type CostItem = {
  item_name: string;
  unit_rate: number;
  unit: string;
  currency: string;
};

export default function BoQPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();

  const { data: project } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    }
  });

  const { data: structural } = useQuery({
    queryKey: ['structural', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('structural_elements').select('*').eq('project_id', id);
      if (error) throw error;
      return data;
    }
  });

  const { data: architectural } = useQuery({
    queryKey: ['architectural', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('architectural_elements').select('*').eq('project_id', id);
      if (error) throw error;
      return data;
    }
  });

  const { data: costCatalog, isLoading: loadingCatalog } = useQuery({
    queryKey: ['cost-catalog', profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_catalog')
        .select('*')
        .eq('company_id', profile?.company_id);
      if (error) throw error;
      return data as CostItem[];
    }
  });

  if (!project || !structural || !architectural || loadingCatalog) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  // Map elements to costs
  const calculateCosts = (items: any[], typeField: string) => {
    return items.map(item => {
      const itemName = item[typeField]?.toLowerCase();
      const costRate = costCatalog?.find(c => c.item_name.toLowerCase() === itemName);
      
      const totalCost = costRate ? item.quantity * costRate.unit_rate : 0;
      
      return {
        ...item,
        unit_rate: costRate?.unit_rate || 0,
        currency: costRate?.currency || 'USD',
        total_cost: totalCost
      };
    });
  };

  const structuralWithCosts = calculateCosts(structural, 'element');
  const archWithCosts = calculateCosts(architectural, 'category');

  const totalStructuralCost = structuralWithCosts.reduce((sum, item) => sum + item.total_cost, 0);
  const totalArchCost = archWithCosts.reduce((sum, item) => sum + item.total_cost, 0);
  const grandTotal = totalStructuralCost + totalArchCost;
  
  // Assume same currency for MVP
  const currency = costCatalog?.[0]?.currency || 'USD';

  const handleExport = () => {
    // Basic export for now
    const allItems = [
      ...structuralWithCosts.map(s => ({
        Type: 'Structural',
        Element: s.element,
        Quantity: s.quantity,
        Unit: s.unit,
        'Unit Rate': s.unit_rate,
        'Total Cost': s.total_cost
      })),
      ...archWithCosts.map(a => ({
        Type: 'Architectural',
        Element: a.category,
        Quantity: a.quantity,
        Unit: a.unit,
        'Unit Rate': a.unit_rate,
        'Total Cost': a.total_cost
      }))
    ];
    generateBoQExcel(project, allItems);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/projects/${id}/export`} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Bill of Quantities (BoQ)</h1>
            <p className="text-gray-400">{project.name}</p>
          </div>
        </div>
        <button onClick={handleExport} className="btn-primary flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          Export BoQ
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 border-t-4 border-t-brand-primary">
          <h3 className="text-sm font-medium text-gray-400 mb-1">Total Structural Cost</h3>
          <p className="text-3xl font-bold text-white">{currency} {totalStructuralCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>
        <div className="glass-card p-6 border-t-4 border-t-purple-500">
          <h3 className="text-sm font-medium text-gray-400 mb-1">Total Architectural Cost</h3>
          <p className="text-3xl font-bold text-white">{currency} {totalArchCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>
        <div className="glass-card p-6 border-t-4 border-t-green-500 bg-brand-primary/5">
          <h3 className="text-sm font-medium text-gray-400 mb-1">Grand Total</h3>
          <p className="text-3xl font-bold text-white">{currency} {grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/10 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-brand-primary" />
          <h2 className="text-lg font-bold text-white">Cost Breakdown</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-gray-300">
              <tr>
                <th className="px-6 py-4 font-medium">Domain</th>
                <th className="px-6 py-4 font-medium">Element</th>
                <th className="px-6 py-4 font-medium text-right">Quantity</th>
                <th className="px-6 py-4 font-medium text-right">Unit Rate</th>
                <th className="px-6 py-4 font-medium text-right">Total Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {structuralWithCosts.map(item => (
                <tr key={item.id} className="hover:bg-white/5">
                  <td className="px-6 py-4"><span className="text-blue-400 bg-blue-400/10 px-2 py-1 rounded text-xs">Structural</span></td>
                  <td className="px-6 py-4 text-white capitalize">{item.element}</td>
                  <td className="px-6 py-4 text-gray-300 text-right">{item.quantity} {item.unit}</td>
                  <td className="px-6 py-4 text-gray-300 text-right">{item.unit_rate > 0 ? `${item.currency} ${item.unit_rate}` : <span className="text-yellow-500 text-xs">Missing Rate</span>}</td>
                  <td className="px-6 py-4 text-white font-medium text-right">{item.currency} {item.total_cost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
              ))}
              {archWithCosts.map(item => (
                <tr key={item.id} className="hover:bg-white/5">
                  <td className="px-6 py-4"><span className="text-purple-400 bg-purple-400/10 px-2 py-1 rounded text-xs">Architectural</span></td>
                  <td className="px-6 py-4 text-white capitalize">{item.category}</td>
                  <td className="px-6 py-4 text-gray-300 text-right">{item.quantity} {item.unit}</td>
                  <td className="px-6 py-4 text-gray-300 text-right">{item.unit_rate > 0 ? `${item.currency} ${item.unit_rate}` : <span className="text-yellow-500 text-xs">Missing Rate</span>}</td>
                  <td className="px-6 py-4 text-white font-medium text-right">{item.currency} {item.total_cost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
              ))}
              
              {structuralWithCosts.length === 0 && archWithCosts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No approved quantities found for this project.
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
