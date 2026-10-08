'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Building2, Tags, CheckCircle2 } from 'lucide-react';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { motion } from 'framer-motion';

const LOCATIONS = ["Main Block", "A Block", "B Block", "C Block", "D Block", "Labs Block", "Library", "Sports Ground", "Cafeteria", "Hostel", "Admin Block", "Main Gate"];

export default function ReportProblem() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ title: '', description: '', location: LOCATIONS[0] });
  const [classification, setClassification] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.title.length > 3 && formData.description.length > 15) {
        setIsTyping(true);
        api.complaints
          .classify(formData.title, formData.description)
          .then((result) => {
            setClassification({
              sector: result.sector,
              category: result.category,
              reason: result.reason,
              priority: result.suggested_priority || result.priority || 'medium',
            });
          })
          .catch(() => setClassification(null))
          .finally(() => setIsTyping(false));
      } else {
        setClassification(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.title, formData.description]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.complaints.create({ ...formData, priority: classification?.priority || 'medium' });
      setSubmittedData({
        id: res.id,
        number: res.complaint_number,
        staff: res.assigned_staff?.full_name || 'Pending assignment',
        sector: res.sector?.name || classification?.sector || 'General',
        status: res.status,
      });
      setStep(3);
    } catch (err) {
      console.error(err);
      alert('Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 3 && submittedData) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Complaint Submitted!</h2>
          <p className="text-slate-500 mb-8">Your issue has been routed to the appropriate team.</p>
          
          <div className="bg-white p-6 rounded-xl border border-slate-200 w-full mb-8 shadow-sm text-left space-y-4">
            <div className="flex justify-between border-b pb-4">
              <span className="text-slate-500">Complaint ID</span>
              <span className="font-semibold text-slate-900">{submittedData.number}</span>
            </div>
            <div className="flex justify-between border-b pb-4">
              <span className="text-slate-500">Assigned Team</span>
              <span className="font-semibold text-slate-900">{submittedData.sector}</span>
            </div>
            <div className="flex justify-between border-b pb-4">
              <span className="text-slate-500">Status</span>
              <span className="font-semibold text-slate-900 uppercase text-sm">{submittedData.status}</span>
            </div>
            <div className="flex justify-between pb-2">
              <span className="text-slate-500">Assigned Staff</span>
              <span className="font-semibold text-slate-900">{submittedData.staff}</span>
            </div>
          </div>
          
          <button 
            onClick={() => router.push(`/student/complaints/${submittedData.id}`)}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition-colors"
          >
            Track My Complaint
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-2 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Report a Problem</h1>
          <p className="text-slate-500">Provide details about the issue. Our AI will automatically route it.</p>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input 
              type="text" 
              value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
              placeholder="E.g., Wi-Fi not working on 3rd floor"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea 
              rows={5}
              value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Describe the issue in detail..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
            <select 
              value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            disabled={!formData.title || !formData.description || submitting}
            onClick={handleSubmit}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Complaint'}
          </button>
        </div>
      </div>

      <div className="md:col-span-1">
        <div className="sticky top-24 bg-slate-800 rounded-xl p-6 text-white shadow-lg">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span> Live AI Analysis
          </h3>
          
          {isTyping ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm">Analyzing report...</p>
            </div>
          ) : classification ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="bg-slate-700/50 rounded-lg p-3">
                <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Detected Sector</span>
                <div className="flex items-center gap-2 font-medium text-cyan-400">
                  <Building2 className="w-4 h-4" /> {classification.sector}
                </div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Suggested Priority</span>
                <PriorityBadge priority={classification.priority} />
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Reasoning</span>
                <p className="text-sm text-slate-300">{classification.reason}</p>
              </div>
            </motion.div>
          ) : (
            <div className="text-slate-400 text-sm py-8 text-center border border-slate-700 border-dashed rounded-lg">
              Start typing to see live classification
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
