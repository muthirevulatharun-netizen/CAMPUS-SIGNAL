'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { format } from 'date-fns';
import { MapPin, Building2, Calendar, CheckCircle2 } from 'lucide-react';
import { Timeline } from '@/components/ui/Timeline';
import Link from 'next/link';

export default function ComplaintDetail({ params }: { params: { id: string } }) {
  const [complaint, setComplaint] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.complaints.get(params.id).then(setComplaint).finally(() => setLoading(false));
  }, [params.id]);

  const confirmResolved = async () => {
    try {
      await api.complaints.updateStatus(params.id, 'closed', 'Student confirmed resolution');
      const updated = await api.complaints.get(params.id);
      setComplaint(updated);
    } catch {
      alert('Unable to update complaint. Please try again.');
    }
  };

  if (loading) return <LoadingSkeleton />;
  if (!complaint) return <div>Not found</div>;

  const STATUS_STEPS = ['submitted', 'assigned', 'acknowledged', 'investigating', 'action_taken', 'resolved', 'closed'];
  const currentIndex = STATUS_STEPS.indexOf(complaint.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/student/complaints" className="text-indigo-600 hover:underline text-sm font-medium">← Back to complaints</Link>
      
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-bold text-slate-500">{complaint.complaint_number}</span>
              <PriorityBadge priority={complaint.priority} />
              <StatusBadge status={complaint.status} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{complaint.title}</h1>
          </div>
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> {format(new Date(complaint.created_at), 'MMM d, yyyy HH:mm')}
          </div>
        </div>

        {/* Status Stepper */}
        <div className="py-8 border-y border-slate-100 mb-6">
          <div className="relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 rounded"></div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-500 rounded transition-all" style={{ width: `${(currentIndex / (STATUS_STEPS.length - 1)) * 100}%` }}></div>
            <div className="relative flex justify-between">
              {STATUS_STEPS.map((step, idx) => (
                <div key={step} className="flex flex-col items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-colors ${idx <= currentIndex ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    {idx < currentIndex ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span className={`text-[10px] uppercase font-semibold hidden md:block ${idx <= currentIndex ? 'text-indigo-900' : 'text-slate-400'}`}>
                    {step.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</h3>
              <p className="text-slate-800 whitespace-pre-wrap">{complaint.description}</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-slate-600">
                  <MapPin className="w-4 h-4" /> <span>{complaint.location}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <Building2 className="w-4 h-4" /> <span>{complaint.sector?.name || 'Unknown Sector'}</span>
                </div>
              </div>
            </div>

            {complaint.assigned_staff && (
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                <h3 className="text-sm font-semibold text-indigo-900 mb-3">Assigned Staff</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold">
                    {complaint.assigned_staff.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-indigo-900">{complaint.assigned_staff.full_name}</p>
                    <p className="text-xs text-indigo-700">{complaint.assigned_staff.department}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Activity Timeline</h3>
          <Timeline items={complaint.status_history || []} />
        </div>

        {complaint.status === 'resolved' && (
          <div className="mt-6 flex justify-end">
            <button onClick={confirmResolved} className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              Confirm & Close Complaint
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
