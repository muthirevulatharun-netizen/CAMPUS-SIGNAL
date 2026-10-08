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
  const [checked, setChecked] = useState<boolean[]>(CHECKLIST.map(() => false));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.issues.get(params.id).then(setIssue).finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <LoadingSkeleton />;
  if (!issue) return <p className="text-slate-600">Signal not found.</p>;

  const trendMult = issue.trend_percentage ? (issue.trend_percentage / 100 + 1).toFixed(1) : '—';

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
            <button
              onClick={() => api.issues.updateStatus(issue.id, 'investigating')}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
            >
              Mark Investigating
            </button>
            <button
              onClick={() => api.issues.updateStatus(issue.id, 'resolved')}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
            >
              Resolve Signal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
