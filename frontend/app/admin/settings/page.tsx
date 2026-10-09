'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

export default function AdminSettingsPage() {
  const [sectors, setSectors] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [newSector, setNewSector] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const refresh = () =>
    Promise.all([api.sectors.list(), api.users.list()]).then(([s, u]) => {
      setSectors(s);
      setUsers(u);
    });

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  const createSector = async () => {
    if (!newSector.name.trim()) return;
    try {
      await api.sectors.create({ name: newSector.name, description: newSector.description, icon: 'building', color: '#6366F1' });
      setNewSector({ name: '', description: '' });
      await refresh();
      setMessage('Sector created successfully.');
    } catch {
      setMessage('Unable to create sector. Please try again.');
    }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
        <p className="text-slate-500">Manage sectors and campus configuration.</p>
        {message && <p className="text-sm text-indigo-600 mt-2">{message}</p>}
      </div>

      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-slate-900">Sector Management</h2>
        <ul className="divide-y divide-slate-100">
          {sectors.map((s) => (
            <li key={s.id} className="py-3 flex justify-between text-sm">
              <span className="font-medium text-slate-800">{s.name}</span>
              <span className="text-slate-500">{s.description}</span>
            </li>
          ))}
        </ul>
        <div className="grid md:grid-cols-2 gap-3 pt-2">
          <input
            value={newSector.name}
            onChange={(e) => setNewSector({ ...newSector, name: e.target.value })}
            placeholder="New sector name"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={newSector.description}
            onChange={(e) => setNewSector({ ...newSector, description: e.target.value })}
            placeholder="Description"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button onClick={createSector} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
          Add Sector
        </button>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-slate-900">User Roles</h2>
        <p className="text-sm text-slate-500">Roles are assigned by verified Google sign-in and managed staff accounts.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2">Name</th>
                <th className="py-2">Email</th>
                <th className="py-2">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50">
                  <td className="py-3 font-medium text-slate-800">{u.full_name}</td>
                  <td className="py-3 text-slate-600">{u.email}</td>
                  <td className="py-3">
                    <span className="capitalize">{u.role}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
