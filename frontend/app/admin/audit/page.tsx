'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { ClipboardList } from 'lucide-react';

interface AuditRecord {
  id: string;
  admin_name: string;
  complaint_number: string | null;
  action: string;
  description: string;
  created_at: string | null;
}

export default function AdminAuditPage() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.audit.list()
      .then(setRecords)
      .catch(() => setError('Unable to load the audit trail. Please try again later.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (error) return <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Audit Trail</h1>
        <p className="text-slate-500">Recent administrative changes and operational actions.</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        {records.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No administrative actions yet"
            message="Administrative changes will appear here as they are made."
          />
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Time</th>
                <th className="px-5 py-3 font-medium">Administrator</th>
                <th className="px-5 py-3 font-medium">Action</th>
                <th className="px-5 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                    {record.created_at ? new Date(record.created_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-800">{record.admin_name}</td>
                  <td className="px-5 py-4 capitalize text-slate-700">{record.action.replaceAll('_', ' ')}</td>
                  <td className="px-5 py-4 text-slate-600">
                    {record.complaint_number ? `${record.complaint_number}: ` : ''}{record.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
