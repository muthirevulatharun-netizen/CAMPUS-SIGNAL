'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Complaint } from '@/lib/types';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { CheckSquare } from 'lucide-react';
import { format } from 'date-fns';

export default function StaffComplaintTable({
  title,
  subtitle,
  filter,
}: {
  title: string;
  subtitle: string;
  filter: (c: Complaint) => boolean;
}) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.complaints.list().then(setComplaints).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;

  const rows = complaints.filter(filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-slate-500">{subtitle}</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={CheckSquare} title="No complaints found" message="Try changing your filters or check back later." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                  <th className="p-4">Complaint</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Created</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80">
                    <td className="p-4">
                      <p className="font-medium text-slate-900">{c.title}</p>
                      <p className="text-xs text-slate-500">{c.complaint_number}</p>
                    </td>
                    <td className="p-4 text-sm text-slate-600">{c.location}</td>
                    <td className="p-4"><PriorityBadge priority={c.priority} /></td>
                    <td className="p-4"><StatusBadge status={c.status} /></td>
                    <td className="p-4 text-sm text-slate-600">{format(new Date(c.created_at), 'MMM d, HH:mm')}</td>
                    <td className="p-4 text-right">
                      <Link href={`/staff/complaints/${c.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
