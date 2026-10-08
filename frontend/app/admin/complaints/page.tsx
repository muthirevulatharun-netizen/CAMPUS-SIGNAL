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
  const [options, setOptions] = useState<{ categories: string[]; locations: string[]; staff: { id: string; full_name: string }[] }>({
    categories: [],
    locations: [],
    staff: [],
  });
  const [search, setSearch] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [location, setLocation] = useState('');
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sectors, setSectors] = useState<{ id: string; name: string }[]>([]);

  const load = () => {
    api.complaints.list({
      search: search || undefined,
      sector_id: sectorId || undefined,
      category: category || undefined,
      priority: priority || undefined,
      status: status || undefined,
      location: location || undefined,
      assigned_staff_id: assignedStaffId || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    })
      .then(setComplaints)
      .catch(console.error);
  };

  useEffect(() => {
    Promise.all([api.complaints.options(), api.sectors.list()])
      .then(([filterOptions, availableSectors]) => {
        setOptions(filterOptions);
        setSectors(availableSectors);
      })
      .catch(console.error);
    load();
  }, []);

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
          <select value={sectorId} onChange={(e) => setSectorId(e.target.value)} className="border border-slate-300 rounded-lg text-sm px-3 py-2">
            <option value="">All sectors</option>
            {sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="border border-slate-300 rounded-lg text-sm px-3 py-2">
            <option value="">All categories</option>
            {options.categories.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
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
          <select value={location} onChange={(e) => setLocation(e.target.value)} className="border border-slate-300 rounded-lg text-sm px-3 py-2">
            <option value="">All locations</option>
            {options.locations.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select value={assignedStaffId} onChange={(e) => setAssignedStaffId(e.target.value)} className="border border-slate-300 rounded-lg text-sm px-3 py-2">
            <option value="">All staff</option>
            {options.staff.map((staffMember) => <option key={staffMember.id} value={staffMember.id}>{staffMember.full_name}</option>)}
          </select>
          <label className="text-xs text-slate-500">
            From
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="ml-2 border border-slate-300 rounded-lg px-2 py-2 text-sm text-slate-700" />
          </label>
          <label className="text-xs text-slate-500">
            To
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="ml-2 border border-slate-300 rounded-lg px-2 py-2 text-sm text-slate-700" />
          </label>
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
