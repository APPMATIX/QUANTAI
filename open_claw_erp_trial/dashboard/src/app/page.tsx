'use client';

import { useState } from 'react';

// Mock data to simulate the database since local docker isn't available
const mockInventory = {
  '11111111-1111-1111-1111-111111111111': [
    { id: '1', sku: 'SKU-A-001', name: 'Alpha Gadget', stock: 50, reorder: 10, shelf: 'A-1-1' },
    { id: '2', sku: 'SKU-A-002', name: 'Alpha Widget', stock: 5, reorder: 20, shelf: 'A-1-2' },
  ],
  '22222222-2222-2222-2222-222222222222': [
    { id: '3', sku: 'SKU-B-001', name: 'Beta Tool', stock: 100, reorder: 15, shelf: 'B-2-1' },
    { id: '4', sku: 'SKU-B-002', name: 'Beta Machine', stock: 8, reorder: 10, shelf: 'B-2-2' },
  ]
};

const mockLogs = {
  '11111111-1111-1111-1111-111111111111': [
    { id: '1', action: 'Fetch Inventory', details: '{"sku": "SKU-A-001"}', status: 'success', time: '10 mins ago' },
    { id: '2', action: 'Low Stock Alert Triggered', details: '{"sku": "SKU-A-002"}', status: 'success', time: '1 hour ago' },
  ],
  '22222222-2222-2222-2222-222222222222': [
    { id: '3', action: 'Fetch Inventory', details: '{"sku": "SKU-B-001"}', status: 'success', time: '20 mins ago' },
  ]
};

export default function Dashboard() {
  const [tenantId, setTenantId] = useState('11111111-1111-1111-1111-111111111111');

  const inventory = mockInventory[tenantId as keyof typeof mockInventory];
  const logs = mockLogs[tenantId as keyof typeof mockLogs];
  
  const tenantName = tenantId === '11111111-1111-1111-1111-111111111111' ? 'Alpha Corp (Tenant A)' : 'Beta Logistics (Tenant B)';

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-8 font-sans transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Area */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[var(--secondary)] p-6 rounded-2xl shadow-sm border border-[var(--border)]">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600">OpenClaw ERP</h1>
            <p className="text-sm opacity-70 mt-1">Multi-tenant Autonomous B2B Dashboard</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-4">
            <span className="text-sm font-medium opacity-80">Active Organization:</span>
            <select 
              className="bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer shadow-sm transition-all"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
            >
              <option value="11111111-1111-1111-1111-111111111111">Tenant A - Alpha Corp</option>
              <option value="22222222-2222-2222-2222-222222222222">Tenant B - Beta Logistics</option>
            </select>
          </div>
        </header>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[var(--secondary)] p-6 rounded-2xl shadow-sm border border-[var(--border)] flex flex-col justify-between hover:shadow-md transition-shadow">
            <h3 className="text-sm font-medium opacity-70">Total Inventory Items</h3>
            <p className="text-4xl font-bold mt-2">{inventory.length}</p>
          </div>
          <div className="bg-[var(--secondary)] p-6 rounded-2xl shadow-sm border border-[var(--border)] flex flex-col justify-between hover:shadow-md transition-shadow">
            <h3 className="text-sm font-medium opacity-70">Low Stock Alerts</h3>
            <p className="text-4xl font-bold mt-2 text-red-500">{inventory.filter(i => i.stock < i.reorder).length}</p>
          </div>
          <div className="bg-[var(--secondary)] p-6 rounded-2xl shadow-sm border border-[var(--border)] flex flex-col justify-between hover:shadow-md transition-shadow">
            <h3 className="text-sm font-medium opacity-70">Active Agents</h3>
            <p className="text-4xl font-bold mt-2 text-emerald-500">2</p>
          </div>
        </div>

        {/* Inventory Table */}
        <section className="bg-[var(--secondary)] p-6 rounded-2xl shadow-sm border border-[var(--border)]">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
            Inventory ({tenantName})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-sm opacity-70">
                  <th className="pb-3 pr-4 font-medium">SKU</th>
                  <th className="pb-3 pr-4 font-medium">Name</th>
                  <th className="pb-3 pr-4 font-medium">Stock</th>
                  <th className="pb-3 pr-4 font-medium">Reorder Lvl</th>
                  <th className="pb-3 pr-4 font-medium">Shelf</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {inventory.map(item => (
                  <tr key={item.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)] transition-colors">
                    <td className="py-4 pr-4 font-mono text-xs">{item.sku}</td>
                    <td className="py-4 pr-4 font-medium">{item.name}</td>
                    <td className="py-4 pr-4">{item.stock}</td>
                    <td className="py-4 pr-4">{item.reorder}</td>
                    <td className="py-4 pr-4 text-gray-500">{item.shelf}</td>
                    <td className="py-4 pr-4">
                      {item.stock < item.reorder ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Healthy
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Agent Logs */}
        <section className="bg-[var(--secondary)] p-6 rounded-2xl shadow-sm border border-[var(--border)]">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            Agent Execution Logs
          </h2>
          <div className="space-y-4">
            {logs.map(log => (
              <div key={log.id} className="flex items-start justify-between p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">{log.action}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">{log.status}</span>
                  </div>
                  <p className="text-xs font-mono opacity-60 mt-1">{log.details}</p>
                </div>
                <span className="text-xs opacity-50 whitespace-nowrap ml-4">{log.time}</span>
              </div>
            ))}
            {logs.length === 0 && <p className="text-sm opacity-50">No agent logs found.</p>}
          </div>
        </section>

      </div>
    </div>
  );
}
