import EditableCell from './EditableCell';
import { Trash2, Plus, MessageSquare } from 'lucide-react';
import type { ArchitecturalElement, ArchCategory } from '../../types/app';

interface ArchTableProps {
  data: ArchitecturalElement[];
  onUpdate: (id: string, field: keyof ArchitecturalElement, value: string | number) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onComment: (id: string, elementName: string) => void;
  filter: string;
}

export default function ArchTable({ data, onUpdate, onDelete, onAdd, onComment, filter }: ArchTableProps) {
  const filteredData = filter === 'All' 
    ? data 
    : data.filter(d => d.category.toLowerCase() === filter.toLowerCase());

  const ConfidenceBadge = ({ level }: { level: string }) => {
    switch(level) {
      case 'high': return <span className="px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">High</span>;
      case 'medium': return <span className="px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">Medium</span>;
      case 'low': return <span className="px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">Low</span>;
      default: return <span className="px-2 py-1 rounded-full bg-gray-500/10 border border-gray-500/20 text-gray-400 text-xs font-medium">-</span>;
    }
  };

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="text-xs text-gray-400 uppercase bg-black/20 border-b border-brand-border">
            <tr>
              <th className="px-4 py-3 font-medium min-w-[150px]">Room</th>
              <th className="px-4 py-3 font-medium min-w-[150px]">Category</th>
              <th className="px-4 py-3 font-medium min-w-[120px]">Qty (m²)</th>
              <th className="px-4 py-3 font-medium">Confidence</th>
              <th className="px-4 py-3 font-medium w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {filteredData.map((row) => (
              <tr key={row.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-4 py-2">
                  <EditableCell 
                    value={row.room || ''} 
                    onChange={(v) => onUpdate(row.id, 'room', v)} 
                  />
                </td>
                <td className="px-4 py-2">
                  <select 
                    value={row.category}
                    onChange={(e) => onUpdate(row.id, 'category', e.target.value as ArchCategory)}
                    className="w-full bg-transparent border border-transparent hover:border-brand-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer appearance-none"
                  >
                    <option value="walls" className="bg-brand-navy">Walls</option>
                    <option value="paint" className="bg-brand-navy">Paint</option>
                    <option value="flooring" className="bg-brand-navy">Flooring</option>
                    <option value="ceiling" className="bg-brand-navy">Ceiling</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  <EditableCell 
                    type="number" 
                    value={row.quantity || 0} 
                    onChange={(v) => onUpdate(row.id, 'quantity', v)} 
                    className="font-medium text-brand-accent"
                  />
                </td>
                <td className="px-4 py-2">
                  <ConfidenceBadge level={row.confidence || '-'} />
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button 
                      onClick={() => onComment(row.id, `${row.room} - ${row.category}`)}
                      className="p-1.5 text-gray-500 hover:text-brand-primary bg-transparent hover:bg-brand-primary/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Add Comment"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onDelete(row.id)}
                      className="p-1.5 text-gray-500 hover:text-red-400 bg-transparent hover:bg-red-400/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="p-3 border-t border-brand-border bg-black/10 flex justify-center">
        <button 
          onClick={onAdd}
          className="flex items-center gap-2 text-sm text-brand-primary hover:text-brand-accent transition-colors py-1 px-3 rounded-lg hover:bg-brand-primary/10"
        >
          <Plus className="w-4 h-4" />
          Add Row
        </button>
      </div>
    </div>
  );
}
