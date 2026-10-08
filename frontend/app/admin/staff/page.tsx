'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { Users } from 'lucide-react';

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [sectors, setSectors] = useState<{ id: string; name: string }[]>([]);
  const [newStaff, setNewStaff] = useState({ full_name: '', email: '', department: '' });
  const [sectorSelections, setSectorSelections] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const [staffData, sectorData] = await Promise.all([api.users.getStaff(), api.sectors.list()]);
      setStaff(staffData);
      setSectors(sectorData);
    } catch {
      setMessage('Unable to load staff management data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const createStaff = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await api.users.createStaff(newStaff);
      setNewStaff({ full_name: '', email: '', department: '' });
      setMessage('Staff account created. Ask the staff member to sign in with their Google account.');
      await load();
    } catch {
      setMessage('Unable to create the staff account. Check that the email is not already registered.');
    }
  };

  const assignSector = async (staffId: string) => {
    const sectorId = sectorSelections[staffId];
    if (!sectorId) return;
    try {
      await api.users.assignStaff(staffId, sectorId);
      setSectorSelections((previous) => ({ ...previous, [staffId]: '' }));
      setMessage('Sector assignment updated.');
      await load();
    } catch {
      setMessage('Unable to assign this sector. The staff member may already be assigned to it.');
    }
  };

  const deactivateStaff = async (staffId: string) => {
    try {
      await api.users.update(staffId, { is_active: false });
      setMessage('Staff account deactivated.');
      await load();
    } catch {
      setMessage('Unable to deactivate the staff account.');
    }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Staff Management</h1>
        <p className="text-slate-500">Sector assignments and operational performance.</p>
        {message && <p className="mt-2 text-sm text-indigo-700" role="status">{message}</p>}
      </div>

      <form onSubmit={createStaff} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-4">
        <input
          required
          value={newStaff.full_name}
          onChange={(event) => setNewStaff({ ...newStaff, full_name: event.target.value })}
          placeholder="Full name"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          required
          type="email"
          value={newStaff.email}
          onChange={(event) => setNewStaff({ ...newStaff, email: event.target.value })}
          placeholder="Email"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          value={newStaff.department}
          onChange={(event) => setNewStaff({ ...newStaff, department: event.target.value })}
          placeholder="Department"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          Add Staff
        </button>
      </form>

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
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {(s.sectors || []).map((sec: any) => (
                  <span key={sec.id} className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                    {sec.name}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <select
                  value={sectorSelections[s.id] || ''}
                  onChange={(event) => setSectorSelections({ ...sectorSelections, [s.id]: event.target.value })}
                  className="max-w-48 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                >
                  <option value="">Assign sector...</option>
                  {sectors.filter((sector) => !(s.sectors || []).some((assigned: any) => assigned.id === sector.id))
                    .map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => void assignSector(s.id)}
                  disabled={!sectorSelections[s.id]}
                  className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 disabled:opacity-50"
                >
                  Assign
                </button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 text-center min-w-[320px]">
              <div>
                <p className="text-lg font-bold text-slate-900">{s.assigned_complaints}</p>
                <p className="text-xs text-slate-500">Assigned</p>
              </div>
              <div>
                <p className="text-lg font-bold text-green-600">{s.resolved_complaints}</p>
                <p className="text-xs text-slate-500">Resolved</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-600">{s.pending_complaints}</p>
                <p className="text-xs text-slate-500">Pending</p>
              </div>
              <div>
                <p className="text-lg font-bold text-indigo-600">{s.average_resolution_hours}h</p>
                <p className="text-xs text-slate-500">Avg. resolve</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void deactivateStaff(s.id)}
              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
            >
              Deactivate
            </button>
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
