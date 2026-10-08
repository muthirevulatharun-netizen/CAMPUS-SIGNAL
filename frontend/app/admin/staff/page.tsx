'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { Users } from 'lucide-react';

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.users.getStaff().then(setStaff).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Staff Management</h1>
        <p className="text-slate-500">Sector assignments and operational performance.</p>
      </div>

      <div className="grid gap-4">
        {staff.map((s) => (
          <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                {s.full_name.charAt(0)}
              </div>
              <div>
                <h2 className="font-bold text-slate-900">{s.full_name}</h2>
                <p className="text-sm text-slate-500">{s.email}</p>
                <p className="text-xs text-slate-500 mt-1 capitalize">Role: {s.role} • {s.department}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(s.sectors || []).map((sec: any) => (
                <span key={sec.id} className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                  {sec.name}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4 text-center min-w-[240px]">
              <div>
                <p className="text-lg font-bold text-slate-900">{s.assigned_complaints}</p>
                <p className="text-xs text-slate-500">Assigned</p>
              </div>
              <div>
                <p className="text-lg font-bold text-green-600">{s.resolved_complaints}</p>
                <p className="text-xs text-slate-500">Resolved</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-600">{Math.max(0, s.assigned_complaints - s.resolved_complaints)}</p>
                <p className="text-xs text-slate-500">Pending</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {staff.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          No staff records found.
        </div>
      )}
    </div>
  );
}
