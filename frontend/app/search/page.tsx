'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { PriorityBadge } from '@/components/ui/PriorityBadge';

function SearchContent() {
  const params = useSearchParams();
  const q = params.get('q') || '';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) return;
    setLoading(true);
    api.search.query(q.trim()).then(setData).finally(() => setLoading(false));
  }, [q]);

  if (!q.trim()) {
    return <p className="text-slate-600">Enter a search term from the header search bar.</p>;
  }

  if (loading) return <LoadingSkeleton />;
  if (!data) return <p className="text-slate-600">No results.</p>;

  const s = data.summary;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Search: “{data.query}”</h1>
        <p className="text-slate-500 mt-1">
          {s.complaints} complaints • {s.locations} locations • {s.issue_groups} underlying issues • {s.staff} assigned staff
        </p>
      </div>

      {data.issue_groups?.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-slate-800">Signals</h2>
          {data.issue_groups.map((ig: any) => (
            <Link key={ig.id} href={`/admin/issues/${ig.id}`} className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300">
              <div className="flex items-center gap-2">
                <PriorityBadge priority={ig.priority} />
                <span className="font-medium text-slate-900">{ig.title}</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">{ig.complaint_count} related reports</p>
            </Link>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-800">Complaints</h2>
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {data.complaints.map((c: any) => (
            <div key={c.id} className="p-4 flex flex-wrap justify-between gap-2">
              <div>
                <p className="font-medium text-slate-900">{c.title}</p>
                <p className="text-xs text-slate-500">{c.complaint_number} • {c.location} • {c.sector}</p>
              </div>
              <PriorityBadge priority={c.priority} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function SearchPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<LoadingSkeleton />}>
        <SearchContent />
      </Suspense>
    </DashboardLayout>
  );
}
