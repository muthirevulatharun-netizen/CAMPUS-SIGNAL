'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { IssueCluster } from '@/components/signals/IssueCluster';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Waves } from 'lucide-react';

export default function AdminSignalsPage() {
  const [issues, setIssues] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.issues.list().then(async (list) => {
      setIssues(list);
      if (list[0]) {
        const detail = await api.issues.get(list[0].id);
        setFeatured(detail);
      }
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Intelligence Signals</h1>
        <p className="text-slate-500 mt-1">Grouped complaints revealing underlying campus problems.</p>
      </div>

      {featured ? (
        <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-xl">
          <IssueCluster
            centerTitle={featured.title}
            complaints={(featured.related_complaints || []).map((c: any) => ({ id: c.id, title: c.title }))}
          />
          <div className="text-center mt-6">
            <PriorityBadge priority={featured.priority} />
            <h2 className="text-2xl font-bold text-white mt-3">{featured.title}</h2>
            <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">{featured.priority_explanation}</p>
            <Link href={`/admin/issues/${featured.id}`} className="inline-block mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
              Investigate Signal
            </Link>
          </div>
        </div>
      ) : (
        <EmptyState icon={Waves} title="No critical signals detected" message="Campus activity is currently within normal levels." />
      )}

      <div className="space-y-4">
        <h3 className="font-bold text-slate-800 text-lg">Active Signals</h3>
        {issues.map((issue) => {
          const mult = issue.trend_percentage ? (issue.trend_percentage / 100 + 1).toFixed(1) : '—';
          return (
            <div key={issue.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <PriorityBadge priority={issue.priority} />
                    <h4 className="text-xl font-bold text-slate-900">{issue.title}</h4>
                  </div>
                  <p className="text-slate-600 text-sm">{issue.description}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    {issue.complaint_count} reports • {issue.affected_users} students • ↑{mult}x trend
                  </p>
                </div>
                <Link href={`/admin/issues/${issue.id}`} className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 text-sm shrink-0">
                  Open Action Center
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
