'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle } from 'lucide-react';

export default function EmergingIssuesPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.analytics.get(), api.issues.list()])
      .then(([a, i]) => {
        setAnalytics(a);
        setIssues(i.filter((g: any) => (g.trend_percentage || 0) > 50 || g.complaint_count >= 8));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;

  const chartData = analytics?.complaints_last_7_days || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Emerging Issues</h1>
        <p className="text-slate-500 mt-1">Rapid increases in similar complaints across campus.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-80">
        <h3 className="font-semibold text-slate-800 mb-4">Campus report volume (last 7 days)</h3>
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={chartData}>
            <XAxis dataKey="day" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {issues.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No emerging issues detected"
          message="Campus activity is currently within normal levels."
        />
      ) : (
        <div className="space-y-4">
          {issues.map((issue) => {
            const mult = issue.trend_percentage ? (issue.trend_percentage / 100 + 1).toFixed(1) : '—';
            return (
              <div key={issue.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">⚠ EMERGING</span>
                      <PriorityBadge priority={issue.priority} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">{issue.title}</h2>
                    <p className="text-sm text-slate-600 mt-2">
                      Reports increased rapidly during the last 7 days and are affecting multiple locations.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-red-600">↑{mult}x</span>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Trend velocity</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-6 mt-4 text-sm text-slate-600">
                  <span><strong className="text-slate-900">{issue.complaint_count}</strong> related reports</span>
                  <span><strong className="text-slate-900">{issue.affected_users}</strong> affected students</span>
                  <span><strong className="text-slate-900">{(issue.affected_locations || []).length}</strong> locations</span>
                </div>
                <Link href={`/admin/issues/${issue.id}`} className="inline-block mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                  Investigate Signal
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
