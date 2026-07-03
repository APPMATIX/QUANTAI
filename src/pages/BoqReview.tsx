import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Download, ArrowLeft, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'constants' | 'Substructure' | 'Superstructure' | 'Finishes' | 'MEP' | 'MTO';

const MTOSection = ({ items }: { items: any[] }) => {
  // Calculate totals
  const totalConcrete = items
    .filter(i => i.description?.toLowerCase().includes('concrete') && i.unit?.toLowerCase() === 'm3')
    .reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

  const totalHollowBlockArea = items
    .filter(i => i.description?.toLowerCase().includes('hollow block') && i.unit?.toLowerCase() === 'm2')
    .reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

  const totalSolidBlockArea = items
    .filter(i => i.description?.toLowerCase().includes('solid block') && i.unit?.toLowerCase() === 'm2')
    .reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

  // Constants for formulas
  const cementPerM3 = 400; // kg/m3
  const sandRatio = 0.45;
  const aggregateRatio = 0.90;
  const steelRatio = 95.4; // kg/m3
  const blockArea = 0.08; // 400x200 mm block

  const cementBags = (totalConcrete * cementPerM3) / 50;
  const sandVol = totalConcrete * sandRatio;
  const aggregateVol = totalConcrete * aggregateRatio;
  const steelTonnes = (totalConcrete * steelRatio) / 1000;
  const hollowBlocksNos = totalHollowBlockArea > 0 ? totalHollowBlockArea / blockArea : 0;
  const solidBlocksNos = totalSolidBlockArea > 0 ? totalSolidBlockArea / blockArea : 0;

  const mtoData = [
    {
      material: 'Cement Bags (50kg)',
      requirement: cementBags,
      unit: 'Bags',
      logic: 'Total Concrete (m3) * Cement per m3 / 50kg'
    },
    {
      material: 'Sand Volume',
      requirement: sandVol,
      unit: 'm3',
      logic: 'Total Concrete (m3) * Sand ratio'
    },
    {
      material: 'Aggregate Volume',
      requirement: aggregateVol,
      unit: 'm3',
      logic: 'Total Concrete (m3) * Aggregate ratio'
    },
    {
      material: 'Reinforcement Steel',
      requirement: steelTonnes,
      unit: 'Tonnes',
      logic: 'Sum of (Concrete Vol * Respective Steel Ratio) / 1000'
    },
    {
      material: 'Hollow Blocks (400x200x200)',
      requirement: hollowBlocksNos,
      unit: 'Nos',
      logic: 'Hollow Blockwork Area (m2) / Area of 1 Block'
    },
    {
      material: 'Solid Blocks (400x200x200)',
      requirement: solidBlocksNos,
      unit: 'Nos',
      logic: 'Solid Blockwork Area (m2) / Area of 1 Block'
    }
  ];

  return (
    <div className="space-y-4 p-2">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-bold text-white">Material Requirements (MTO) - <span className="text-brand-primary">BASED ON AI ANALYSIS</span></h2>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="bg-brand-surface text-gray-400">
          <tr>
            <th className="px-4 py-3 font-medium border-b border-brand-border">Material</th>
            <th className="px-4 py-3 font-medium text-right border-b border-brand-border">Total Requirement</th>
            <th className="px-4 py-3 font-medium border-b border-brand-border">Unit</th>
            <th className="px-4 py-3 font-medium border-b border-brand-border">Formula Logic</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-border bg-black/20">
          {mtoData.map((row, idx) => (
            <tr key={idx} className="hover:bg-brand-surface/50 transition-colors">
              <td className="px-4 py-3 text-white font-medium">{row.material}</td>
              <td className="px-4 py-3 text-brand-primary font-bold text-right">
                {row.requirement.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </td>
              <td className="px-4 py-3 text-gray-400">{row.unit}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">{row.logic}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function BoqReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<Tab>('constants');
  const [loading, setLoading] = useState(true);
  const [constants, setConstants] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [constsRes, itemsRes] = await Promise.all([
        supabase.from('boq_constants').select('*').eq('project_id', id).order('created_at'),
        supabase.from('boq_items').select('*').eq('project_id', id).order('created_at')
      ]);

      if (constsRes.error) throw constsRes.error;
      if (itemsRes.error) throw itemsRes.error;

      setConstants(constsRes.data || []);
      setItems(itemsRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load BOQ data');
    } finally {
      setLoading(false);
    }
  };

  const handleConstantChange = (id: string, field: string, value: any) => {
    setConstants(constants.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleItemChange = (id: string, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Auto-calculate amount if quantity or rate changes
        if (field === 'quantity' || field === 'rate') {
          updated.amount = (Number(updated.quantity) || 0) * (Number(updated.rate) || 0);
        }
        return updated;
      }
      return item;
    }));
  };

  const saveConstant = async (constant: any) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('boq_constants')
        .update({
          value: constant.value,
          unit: constant.unit,
          description: constant.description
        })
        .eq('id', constant.id);
      
      if (error) throw error;
    } catch (err) {
      console.error(err);
      toast.error('Failed to save constant');
    } finally {
      setSaving(false);
    }
  };

  const saveItem = async (item: any) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('boq_items')
        .update({
          nos: item.nos,
          length_m: item.length_m,
          width_m: item.width_m,
          height_m: item.height_m,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          amount: item.amount,
          remarks: item.remarks
        })
        .eq('id', item.id);
      
      if (error) throw error;
    } catch (err) {
      console.error(err);
      toast.error('Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const exportToCSV = () => {
    let csv = '';
    
    // Export Constants
    csv += 'CONSTANTS & VARIABLES\n';
    csv += 'Constant / Variable,Value,Unit,Description\n';
    constants.forEach(c => {
      csv += `"${c.name}","${c.value || ''}","${c.unit || ''}","${c.description || ''}"\n`;
    });
    csv += '\n\n';

    // Export Items by Category
    const categories = ['Substructure', 'Superstructure', 'Finishes', 'MEP'];
    categories.forEach(cat => {
      const catItems = items.filter(i => i.category === cat);
      if (catItems.length > 0) {
        csv += `${cat.toUpperCase()}\n`;
        csv += 'Item Description,Nos,Length (m),Width (m),Depth/Height (m),Quantity,Unit,Rate,Amount,Source / Remarks\n';
        catItems.forEach(i => {
          csv += `"${i.description}","${i.nos || ''}","${i.length_m || ''}","${i.width_m || ''}","${i.height_m || ''}","${i.quantity || 0}","${i.unit || ''}","${i.rate || 0}","${i.amount || 0}","${i.remarks || ''}"\n`;
        });
        csv += '\n\n';
      }
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `BOQ_Project_${id}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'constants', label: 'Constants / Variables' },
    { id: 'Substructure', label: 'Substructure' },
    { id: 'Superstructure', label: 'Superstructure' },
    { id: 'Finishes', label: 'Finishes & Blockwork' },
    { id: 'MEP', label: 'MEP' },
    { id: 'MTO', label: 'Material Requirements (MTO)' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
      </div>
    );
  }

  const currentItems = items.filter(i => i.category === activeTab);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-brand-surface rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-white">Bill of Quantities (BOQ) Review</h1>
          {saving && <span className="text-xs text-brand-primary flex items-center gap-1"><Save className="w-3 h-3 animate-pulse" /> Saving...</span>}
        </div>
        
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="flex border-b border-brand-border overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-brand-primary text-brand-primary bg-brand-primary/5'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-brand-surface'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'constants' ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-surface text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Constant / Variable</th>
                  <th className="px-4 py-3 font-medium">Value</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {constants.map(c => (
                  <tr key={c.id} className="hover:bg-brand-surface/50 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={c.value || ''}
                        onChange={(e) => handleConstantChange(c.id, 'value', e.target.value)}
                        onBlur={() => saveConstant(c)}
                        className="w-full bg-transparent border border-transparent hover:border-brand-border focus:border-brand-primary rounded px-2 py-1 outline-none text-white transition-colors"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={c.unit || ''}
                        onChange={(e) => handleConstantChange(c.id, 'unit', e.target.value)}
                        onBlur={() => saveConstant(c)}
                        className="w-full bg-transparent border border-transparent hover:border-brand-border focus:border-brand-primary rounded px-2 py-1 outline-none text-gray-300 transition-colors"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={c.description || ''}
                        onChange={(e) => handleConstantChange(c.id, 'description', e.target.value)}
                        onBlur={() => saveConstant(c)}
                        className="w-full bg-transparent border border-transparent hover:border-brand-border focus:border-brand-primary rounded px-2 py-1 outline-none text-gray-400 transition-colors"
                      />
                    </td>
                  </tr>
                ))}
                {constants.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No constants generated.</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : activeTab === 'MTO' ? (
            <MTOSection items={items} />
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-brand-surface text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium min-w-[200px]">Item Description</th>
                  <th className="px-4 py-3 font-medium">Nos</th>
                  <th className="px-4 py-3 font-medium">L (m)</th>
                  <th className="px-4 py-3 font-medium">W (m)</th>
                  <th className="px-4 py-3 font-medium">D/H (m)</th>
                  <th className="px-4 py-3 font-medium">Quantity</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Rate</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium min-w-[200px]">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {currentItems.map(item => (
                  <tr key={item.id} className="hover:bg-brand-surface/50 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{item.description}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.nos || ''}
                        onChange={(e) => handleItemChange(item.id, 'nos', e.target.value)}
                        onBlur={() => saveItem(item)}
                        className="w-16 bg-transparent border border-transparent hover:border-brand-border focus:border-brand-primary rounded px-2 py-1 outline-none text-white text-center"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.length_m || ''}
                        onChange={(e) => handleItemChange(item.id, 'length_m', e.target.value)}
                        onBlur={() => saveItem(item)}
                        className="w-16 bg-transparent border border-transparent hover:border-brand-border focus:border-brand-primary rounded px-2 py-1 outline-none text-white text-center"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.width_m || ''}
                        onChange={(e) => handleItemChange(item.id, 'width_m', e.target.value)}
                        onBlur={() => saveItem(item)}
                        className="w-16 bg-transparent border border-transparent hover:border-brand-border focus:border-brand-primary rounded px-2 py-1 outline-none text-white text-center"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.height_m || ''}
                        onChange={(e) => handleItemChange(item.id, 'height_m', e.target.value)}
                        onBlur={() => saveItem(item)}
                        className="w-16 bg-transparent border border-transparent hover:border-brand-border focus:border-brand-primary rounded px-2 py-1 outline-none text-white text-center"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.quantity || ''}
                        onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                        onBlur={() => saveItem(item)}
                        className="w-20 bg-brand-surface/50 border border-brand-border focus:border-brand-primary rounded px-2 py-1 outline-none text-white text-center font-bold"
                      />
                    </td>
                    <td className="px-4 py-2 text-gray-400">{item.unit}</td>
                    <td className="px-4 py-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={item.rate || ''}
                          onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                          onBlur={() => saveItem(item)}
                          className="w-24 bg-brand-surface border border-brand-border focus:border-brand-primary rounded pl-6 pr-2 py-1 outline-none text-green-400 font-bold"
                          placeholder="0.00"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-white">
                      ${Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.remarks || ''}
                        onChange={(e) => handleItemChange(item.id, 'remarks', e.target.value)}
                        onBlur={() => saveItem(item)}
                        className="w-full bg-transparent border border-transparent hover:border-brand-border focus:border-brand-primary rounded px-2 py-1 outline-none text-gray-400 min-w-[200px]"
                        placeholder="Add remark..."
                      />
                    </td>
                  </tr>
                ))}
                {currentItems.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">No items generated for this category.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
