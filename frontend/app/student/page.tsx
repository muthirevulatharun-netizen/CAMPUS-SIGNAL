'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Complaint } from '@/lib/types';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { KpiCard } from '@/components/ui/KpiCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import Link from 'next/link';
import { PlusCircle, FileText, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.complaints.list({ role: 'student' })
      .then(data => setComplaints(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const openCount = complaints.filter(c => ['submitted', 'assigned', 'acknowledged'].includes(c.status)).length;
  const inProgressCount = complaints.filter(c => ['investigating', 'action_taken'].includes(c.status)).length;
  const resolvedCount = complaints.filter(c => ['resolved', 'closed'].includes(c.status)).length;

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user?.full_name}</h1>
          <p className="text-slate-500">{format(new Date(), 'EEEE, MMMM do yyyy')}</p>
        </div>
        <Link 
          href="/student/report" 
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <PlusCircle className="w-5 h-5" /> Report a Problem
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard title="My Complaints" value={complaints.length} icon={FileText} color="bg-indigo-500" />
        <KpiCard title="Open" value={openCount} icon={AlertCircle} color="bg-amber-500" />
        <KpiCard title="In Progress" value={inProgressCount} icon={Clock} color="bg-blue-500" />
        <KpiCard title="Resolved" value={resolvedCount} icon={CheckCircle2} color="bg-green-500" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="font-semibold text-slate-800">Recent Complaints</h2>
          <Link href="/student/complaints" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">View All</Link>
        </div>
        {complaints.length === 0 ? (
          <EmptyState 
            icon={FileText} 
            title="No complaints yet" 
            message="When you report an issue on campus, it will appear here."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {complaints.slice(0, 5).map(complaint => (
              <Link key={complaint.id} href={`/student/complaints/${complaint.id}`} className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{complaint.title}</span>
                    <PriorityBadge priority={complaint.priority} />
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span>{complaint.complaint_number}</span>
                    <span>•</span>
                    <span>{complaint.location}</span>
                    <span>•</span>
                    <span>{format(new Date(complaint.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>
                <div>
                  <StatusBadge status={complaint.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
