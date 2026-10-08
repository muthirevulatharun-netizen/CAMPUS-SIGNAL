'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const PIE_COLORS = ['#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.analytics.get().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (!data) return <p className="text-slate-600">Unable to load analytics.</p>;

  const modules = data.sector_modules || {};

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Campus Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Complaints by Sector">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.complaints_by_sector} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={100} fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366F1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Complaints by Priority">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.complaints_by_priority} dataKey="count" nameKey="name" innerRadius={50} outerRadius={80}>
                {data.complaints_by_priority.map((entry: any, i: number) => (
                  <Cell key={entry.name} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Complaints Over Time (30 days)">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.complaints_over_time}>
              <XAxis dataKey="date" hide />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#06B6D4" fill="#06B6D420" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Locations">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.top_locations}>
              <XAxis dataKey="location" hide />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Staff Resolution Performance">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.staff_performance?.slice(0, 8)}>
              <XAxis dataKey="staff_name" hide />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="resolved" fill="#6366F1" name="Resolved" />
              <Bar dataKey="pending" fill="#F59E0B" name="Pending" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Resolution Time by Sector (hours)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.resolution_times} layout="vertical">
              <XAxis type="number" />
              <YAxis dataKey="sector" type="category" width={90} fontSize={11} />
              <Tooltip />
              <Bar dataKey="avg_hours" fill="#06B6D4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Sector Modules</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Object.entries(modules).map(([key, mod]: [string, any]) => (
            <div key={key} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900 capitalize">{key.replace('_', ' ')}</h3>
              <p className="text-sm text-slate-500 mt-1">{mod.complaint_count} complaints • {mod.open} open</p>
              {mod.signal?.title && (
                <p className="text-sm font-medium text-indigo-700 mt-3">{mod.signal.title}</p>
              )}
              <p className="text-xs text-slate-600 mt-2">Peak: {mod.signal?.peak_time || '—'}</p>
              <p className="text-xs text-slate-600 mt-1">Recommended: {mod.signal?.recommended_action}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-96 flex flex-col">
      <h3 className="font-semibold text-slate-800 mb-4">{title}</h3>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
