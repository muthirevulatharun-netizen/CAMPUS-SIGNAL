'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Complaint } from '@/lib/types';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { KpiCard } from '@/components/ui/KpiCard';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import Link from 'next/link';
import { format } from 'date-fns';
import { AlertTriangle, Clock, CheckCircle2, UserCheck } from 'lucide-react';

export default function StaffDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.complaints.list()
      .then(data => setComplaints(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;

  const highPriority = complaints.filter(c => c.priority === 'high' || c.priority === 'critical').length;
  const inProgress = complaints.filter(c => ['investigating', 'action_taken'].includes(c.status)).length;
  const resolvedToday = complaints.filter(c => ['resolved'].includes(c.status)).length;

  return (
    <div className="space-y-6">
      <div>
        <span className="text-sm font-bold text-indigo-600 tracking-wider uppercase">{user?.department || 'IT SUPPORT'}</span>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Welcome, {user?.full_name}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard title="Assigned Queue" value={complaints.length} icon={UserCheck} color="bg-blue-500" />
        <KpiCard title="High Priority" value={highPriority} icon={AlertTriangle} color="bg-orange-500" />
        <KpiCard title="Investigating" value={inProgress} icon={Clock} color="bg-violet-500" />
        <KpiCard title="Resolved Today" value={resolvedToday} icon={CheckCircle2} color="bg-green-500" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
          <h2 className="font-semibold text-slate-800">My Queue</h2>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded shadow-sm font-medium">All</button>
            <button className="px-3 py-1.5 text-sm bg-slate-100 text-slate-600 rounded font-medium hover:bg-slate-200">High Priority</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="p-4 font-medium">Complaint</th>
                <th className="p-4 font-medium">Location</th>
                <th className="p-4 font-medium">Priority</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Time</th>
                <th className="p-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {complaints.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="p-4">
                    <p className="font-medium text-slate-900">{c.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{c.complaint_number}</p>
                  </td>
                  <td className="p-4 text-sm text-slate-600">{c.location}</td>
                  <td className="p-4"><PriorityBadge priority={c.priority} /></td>
                  <td className="p-4"><StatusBadge status={c.status} /></td>
                  <td className="p-4 text-sm text-slate-600">{format(new Date(c.created_at), 'MMM d, HH:mm')}</td>
                  <td className="p-4 text-right">
                    <Link href={`/staff/complaints/${c.id}`} className="inline-block px-3 py-1.5 bg-indigo-50 text-indigo-700 font-medium text-sm rounded hover:bg-indigo-100 transition-colors">
                      Open
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
