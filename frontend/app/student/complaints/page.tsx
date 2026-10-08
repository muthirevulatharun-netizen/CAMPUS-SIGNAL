'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Complaint } from '@/lib/types';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function StudentComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.complaints.list().then(setComplaints).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">My Complaints</h1>
        <Link href="/student/report" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          + Report a problem
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {complaints.length === 0 ? (
          <EmptyState icon={FileText} title="No complaints found" message="Your submitted campus issues will appear here." />
        ) : (
          <div className="divide-y divide-slate-100">
            {complaints.map((c) => (
              <Link key={c.id} href={`/student/complaints/${c.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 hover:bg-slate-50">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">{c.title}</span>
                    <PriorityBadge priority={c.priority} />
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {c.complaint_number} • {c.location} • {format(new Date(c.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <StatusBadge status={c.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
