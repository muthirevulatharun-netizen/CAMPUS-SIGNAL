'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { KpiCard } from '@/components/ui/KpiCard';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { format } from 'date-fns';
import { FileText, AlertTriangle, CheckCircle2, Waves, Clock, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Link from 'next/link';

export default function AdminOverview() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.analytics.get(), api.issues.list()])
      .then(([a, i]) => {
        setAnalytics(a);
        setIssues(i.filter((g: any) => g.status === 'active').slice(0, 5));
      })
      .catch(() => {
        setAnalytics(null);
        setIssues([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (!analytics) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-slate-600">
        Unable to load campus overview. Please ensure the backend is running and try again.
      </div>
    );
  }

  const PIE_COLORS = ['#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-500">
          Campus Overview
        </h1>
        <p className="text-slate-500 mt-1 flex items-center justify-between">
          <span>Here's what is happening across your campus.</span>
          <span className="text-sm font-medium">{format(new Date(), 'MMM d, yyyy HH:mm')}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard title="Total Complaints" value={analytics.total_complaints} icon={FileText} color="bg-blue-500" />
        <KpiCard title="Open Issues" value={analytics.open_issues} icon={AlertTriangle} color="bg-amber-500" />
        <KpiCard title="High Priority" value={analytics.high_priority} icon={TrendingUp} color="bg-orange-500" />
        <KpiCard title="Resolved" value={analytics.resolved} icon={CheckCircle2} color="bg-green-500" />
        <KpiCard title="Emerging Signals" value={analytics.emerging_signals} icon={Waves} color="bg-red-500" />
        <KpiCard title="Avg Resolution" value={analytics.avg_resolution_hours + 'h'} icon={Clock} color="bg-teal-500" />
      </div>

      {issues.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
            Signals Requiring Attention
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {issues.map(issue => (
              <div key={issue.id} className="bg-white rounded-xl border-l-4 border-l-red-500 border-y border-r border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <PriorityBadge priority={issue.priority} />
                    <h3 className="text-lg font-bold text-slate-900">{issue.title}</h3>
                  </div>
                  <p className="text-slate-600 text-sm mb-3">Detected pattern of related complaints requiring systemic resolution.</p>
                  <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
                    <span className="text-slate-700">{issue.complaint_count} reports</span>
                    <span>•</span>
                    <span className="text-slate-700">{issue.affected_users} users impacted</span>
                    <span>•</span>
                    <span className="text-red-600 flex items-center gap-1">↑{issue.trend_percentage ? (issue.trend_percentage / 100 + 1).toFixed(1) : '—'}x this week</span>
                  </div>
                </div>
                <Link href={`/admin/issues/${issue.id}`} className="whitespace-nowrap px-6 py-3 bg-red-50 text-red-700 hover:bg-red-100 font-medium rounded-lg transition-colors">
                  Investigate Signal
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-80">
          <h3 className="font-semibold text-slate-800 mb-4">Complaints by Sector</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.complaints_by_sector}>
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{fill: '#f1f5f9'}} />
              <Bar dataKey="count" fill="#6366F1" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-80">
          <h3 className="font-semibold text-slate-800 mb-4">Priority Distribution</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={analytics.complaints_by_priority} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="count" nameKey="name">
                {(analytics.complaints_by_priority || []).map((entry: any, i: number) => <Cell key={`cell-${i}`} fill={entry.color || PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
