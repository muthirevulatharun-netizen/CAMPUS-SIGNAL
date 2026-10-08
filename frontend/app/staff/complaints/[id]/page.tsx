'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Timeline } from '@/components/ui/Timeline';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { format } from 'date-fns';

const ACTIONS = [
  { status: 'acknowledged', label: 'Accept' },
  { status: 'investigating', label: 'Investigate' },
  { status: 'action_taken', label: 'Action Taken' },
  { status: 'resolved', label: 'Mark Resolved' },
];

export default function StaffComplaintDetail({ params }: { params: { id: string } }) {
  const [complaint, setComplaint] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = () => api.complaints.get(params.id).then(setComplaint);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [params.id]);

  const updateStatus = async (status: string, label: string) => {
    setBusy(true);
    try {
      await api.complaints.updateStatus(params.id, status, comment || `${label} by staff`);
      setComment('');
      await load();
    } catch {
      alert('Unable to update status. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingSkeleton />;
  if (!complaint) return <p className="text-slate-600">Complaint not found.</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/staff" className="text-sm font-medium text-indigo-600 hover:underline">← Back to dashboard</Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-slate-500">{complaint.complaint_number}</span>
          <PriorityBadge priority={complaint.priority} />
          <StatusBadge status={complaint.status} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{complaint.title}</h1>
        <p className="text-slate-700 whitespace-pre-wrap">{complaint.description}</p>
        <p className="text-sm text-slate-500">{complaint.location} • {format(new Date(complaint.created_at), 'MMM d, yyyy HH:mm')}</p>

        <div className="border-t border-slate-100 pt-4 space-y-3">
          <label className="text-sm font-medium text-slate-700">Progress comment</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Add notes for the student audit trail..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <div className="flex flex-wrap gap-2">
            {ACTIONS.map((a) => (
              <button
                key={a.status}
                disabled={busy}
                onClick={() => updateStatus(a.status, a.label)}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900 mb-4">Audit Trail</h2>
        <Timeline items={complaint.status_history || []} />
      </div>
    </div>
  );
}
