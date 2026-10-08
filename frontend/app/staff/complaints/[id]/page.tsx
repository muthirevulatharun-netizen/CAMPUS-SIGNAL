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
  const [attachments, setAttachments] = useState<any[]>([]);
  const [comment, setComment] = useState('');
  const [evidence, setEvidence] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const data = await api.complaints.get(params.id);
    setComplaint(data);
    const files = await api.complaints.attachments(params.id).catch(() => []);
    setAttachments(files);
  };

  useEffect(() => {
    load().catch(() => setMessage('Unable to load this complaint.')).finally(() => setLoading(false));
  }, [params.id]);

  const updateStatus = async (status: string, label: string) => {
    setBusy(true);
    setMessage('');
    try {
      await api.complaints.updateStatus(params.id, status, comment || `${label} by staff`);
      setComment('');
      await load();
    } catch {
      setMessage('Unable to update status. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const uploadEvidence = async () => {
    if (!evidence) return;
    setBusy(true);
    setMessage('');
    try {
      await api.complaints.uploadAttachment(params.id, evidence);
      setEvidence(null);
      await load();
      setMessage('Evidence uploaded successfully.');
    } catch {
      setMessage('Unable to upload the image. Use a JPEG, PNG, or WebP file up to 5 MB.');
    } finally {
      setBusy(false);
    }
  };

  const downloadAttachment = async (attachment: any) => {
    try {
      const blob = await api.complaints.downloadAttachment(params.id, attachment.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.display_name;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setMessage('Unable to download this evidence image.');
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
        {attachments.length > 0 && (
          <div className="border-t border-slate-100 pt-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Photos and evidence</h2>
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment) => (
                <button
                  key={attachment.id}
                  type="button"
                  onClick={() => void downloadAttachment(attachment)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-50"
                >
                  {attachment.display_name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-slate-100 pt-4 space-y-3">
          <label className="text-sm font-medium text-slate-700">Progress comment</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Add notes for the student audit trail..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex-1 text-sm font-medium text-slate-700">
              Upload evidence (image up to 5 MB)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setEvidence(event.target.files?.[0] || null)}
                className="mt-1 block w-full text-sm font-normal text-slate-600"
              />
            </label>
            <button
              type="button"
              onClick={() => void uploadEvidence()}
              disabled={!evidence || evidence.size > 5 * 1024 * 1024 || busy}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
            >
              Upload Evidence
            </button>
          </div>
          {message && <p className="text-sm text-indigo-700" role="status">{message}</p>}
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
