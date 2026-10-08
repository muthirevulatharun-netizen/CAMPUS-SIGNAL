'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { IssueCluster } from '@/components/signals/IssueCluster';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

const CHECKLIST = [
  'Contact responsible sector team',
  'Verify infrastructure / equipment',
  'Notify affected students',
  'Monitor for 2 hours',
  'Document resolution steps',
];

export default function AdminIssueDetail({ params }: { params: { id: string } }) {
  const [issue, setIssue] = useState<any>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [checked, setChecked] = useState<boolean[]>(CHECKLIST.map(() => false));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([api.issues.get(params.id), api.users.getStaff()])
      .then(([issueData, staffData]) => {
        setIssue(issueData);
        setStaff(staffData);
      })
      .catch(() => setMessage('Unable to load this signal. Please try again.'))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <LoadingSkeleton />;
  if (!issue) return <p className="text-slate-600">{message || 'Signal not found.'}</p>;

  const trendMult = issue.trend_percentage ? (issue.trend_percentage / 100 + 1).toFixed(1) : '—';

  const updateStatus = async (status: string) => {
    setBusy(true);
    setMessage('');
    try {
      await api.issues.updateStatus(issue.id, status);
      setIssue(await api.issues.get(issue.id));
      setMessage(`Signal marked ${status}.`);
    } catch {
      setMessage('Unable to update the signal status.');
    } finally {
      setBusy(false);
    }
  };

  const assignSignal = async () => {
    if (!selectedStaff) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await api.issues.assign(issue.id, selectedStaff);
      setMessage(`Signal assigned across ${result.complaints_assigned} related complaints.`);
    } catch {
      setMessage("Unable to assign the signal. Check that the selected staff member belongs to this sector.");
    } finally {
      setBusy(false);
    }
  };

  const notifyTeam = async () => {
    setBusy(true);
    setMessage('');
    try {
      const result = await api.issues.notifyTeam(issue.id);
      setMessage(`Alert sent to ${result.recipients} sector staff members.`);
    } catch {
      setMessage('Unable to notify the sector team.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <Link href="/admin/signals" className="text-sm font-medium text-indigo-600 hover:underline">← Back to signals</Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">SIGNAL DETECTED</span>
          <PriorityBadge priority={issue.priority} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">{issue.title}</h1>
        <p className="text-slate-600 mt-2">{issue.description}</p>
        <p className="text-sm text-indigo-700 mt-4 font-medium">{issue.priority_explanation}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <h2 className="text-white font-semibold mb-4">Message Cluster</h2>
          <IssueCluster
            centerTitle={issue.title}
            complaints={(issue.related_complaints || []).map((c: any) => ({ id: c.id, title: c.title }))}
          />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500 block">Related reports</span><span className="text-2xl font-bold">{issue.complaint_count}</span></div>
            <div><span className="text-slate-500 block">Affected students</span><span className="text-2xl font-bold">{issue.affected_users}</span></div>
            <div><span className="text-slate-500 block">Locations</span><span className="text-2xl font-bold">{(issue.affected_locations || []).length}</span></div>
            <div><span className="text-slate-500 block">Trend</span><span className="text-2xl font-bold text-red-600">↑{trendMult}x</span></div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Recommended actions</h3>
            <ul className="space-y-2">
              {CHECKLIST.map((item, i) => (
                <li key={item}>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked[i]}
                      onChange={() => setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)))}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    {item}
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={selectedStaff}
              onChange={(event) => setSelectedStaff(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Assign to sector staff...</option>
              {staff
                .filter((person) => person.sectors?.some((sector: { id: string }) => sector.id === issue.sector_id))
                .map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
            </select>
            <button
              onClick={() => void assignSignal()}
              disabled={busy || !selectedStaff}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
            >
              Assign Signal
            </button>
            <button
              onClick={() => void notifyTeam()}
              disabled={busy}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
            >
              Notify Team
            </button>
            <button
              onClick={() => void updateStatus('investigating')}
              disabled={busy}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
            >
              Mark Investigating
            </button>
            <button
              onClick={() => void updateStatus('resolved')}
              disabled={busy}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
            >
              Resolve Signal
            </button>
          </div>
          {message && <p className="text-sm text-indigo-700" role="status">{message}</p>}
        </div>
      </div>
    </div>
  );
}
