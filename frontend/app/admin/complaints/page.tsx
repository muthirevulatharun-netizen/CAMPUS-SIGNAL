'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');

  const load = () => {
    api.complaints.list({ search: search || undefined, priority: priority || undefined, status: status || undefined })
      .then(setComplaints)
      .catch(console.error);
  };

  useEffect(() => {
    load();
  }, [priority, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">All Complaints</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Search..."
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="border border-slate-300 rounded-lg text-sm px-3 py-2">
            <option value="">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-slate-300 rounded-lg text-sm px-3 py-2">
            <option value="">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="assigned">Assigned</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
          </select>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            <Filter className="w-4 h-4" /> Apply
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="p-4 font-medium">ID & Title</th>
                <th className="p-4 font-medium">Sector</th>
                <th className="p-4 font-medium">Priority</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Created</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {complaints.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <p className="font-medium text-slate-900">{c.title}</p>
                    <p className="text-xs text-slate-500">{c.complaint_number}</p>
                  </td>
                  <td className="p-4 text-sm text-slate-600">{c.sector?.name || 'Unknown'}</td>
                  <td className="p-4"><PriorityBadge priority={c.priority} /></td>
                  <td className="p-4"><StatusBadge status={c.status} /></td>
                  <td className="p-4 text-sm text-slate-600">{format(new Date(c.created_at), 'MMM d')}</td>
                  <td className="p-4 text-right">
                    <Link href={`/student/complaints/${c.id}`} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
