'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function DemoPage() {
  const [phase, setPhase] = useState('idle');
  const [signal, setSignal] = useState<any>(null);
  const [injecting, setInjecting] = useState(false);

  const startDemo = async () => {
    setInjecting(true);
    setPhase('report1');
    try {
      const result = await api.demo.inject();
      setSignal(result.issue_group);
    } catch {
      setSignal(null);
    } finally {
      setInjecting(false);
    }

    setTimeout(() => setPhase('classifying'), 2000);
    setTimeout(() => setPhase('assigned'), 4000);
    setTimeout(() => setPhase('more_reports'), 6000);
    setTimeout(() => setPhase('detecting'), 9000);
    setTimeout(() => setPhase('signal_detected'), 12000);
  };

  const reportCount = signal?.complaint_count || 42;
  const signalTitle = signal?.title || 'Campus Network Instability';

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col relative overflow-hidden font-sans">
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      <header className="p-6 flex justify-between items-center z-10 border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <span className="font-bold text-xl tracking-widest uppercase">Campus Signal Demo</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className={`w-2 h-2 rounded-full ${phase === 'idle' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
          SYSTEM STATUS: {phase === 'idle' ? 'NORMAL' : 'ACTIVE'}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-8 z-10">
        {phase === 'idle' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-slate-100">See Signal Detection in Action</h1>
            <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
              Inject live Wi-Fi complaints into the database, watch grouping run, and surface a campus-wide network instability signal.
            </p>
            <button
              onClick={startDemo}
              disabled={injecting}
              className="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-xl text-lg shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)] transition-all hover:scale-105 flex items-center gap-3 mx-auto"
            >
              {injecting ? 'Injecting reports...' : '▶ START LIVE DEMO'}
            </button>
          </motion.div>
        )}

        {phase !== 'idle' && phase !== 'signal_detected' && (
          <div className="w-full max-w-4xl flex flex-col gap-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold text-cyan-400">
                {phase === 'report1' ? '5 NEW REPORTS INJECTED' :
                 phase === 'classifying' ? 'TEXT UNDERSTANDING → IT & Wi-Fi' :
                 phase === 'assigned' ? 'AUTO-ASSIGNED TO IT SUPPORT' :
                 phase === 'more_reports' ? 'SIMILARITY DETECTED ACROSS LOCATIONS' :
                 phase === 'detecting' ? 'GROUPING COMPLAINTS INTO ONE SIGNAL' : ''}
              </h2>
            </div>
            <div className="flex flex-col gap-4">
              {[
                'Wi-Fi is not working in C Block',
                'Internet keeps disconnecting',
                'Wi-Fi very slow today',
                'Cannot access student portal',
                'Network unavailable in computer lab',
              ].map((text, i) => (
                <motion.div
                  key={text}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.15 }}
                  className="bg-slate-800 p-4 rounded-lg border border-slate-700"
                >
                  <span className="text-xs text-slate-400">Student report • live DB</span>
                  <p className="text-lg mt-1">&quot;{text}&quot;</p>
                </motion.div>
              ))}
              {phase === 'detecting' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 flex justify-center">
                  <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </motion.div>
              )}
            </div>
          </div>
        )}

        {phase === 'signal_detected' && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-2xl border-2 border-red-500 p-10 max-w-3xl w-full shadow-[0_0_100px_-20px_rgba(239,68,68,0.4)] text-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 animate-pulse" />
            <div className="inline-flex items-center gap-2 bg-red-950 text-red-500 px-4 py-1.5 rounded-full text-sm font-bold tracking-wider mb-6 border border-red-900">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
              NEW SIGNAL DETECTED
            </div>

            <h2 className="text-4xl font-extrabold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              {signalTitle}
            </h2>

            <div className="grid grid-cols-2 gap-4 text-left">
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                <span className="text-slate-400 text-sm block mb-1">Related Reports</span>
                <span className="text-3xl font-bold text-white">{reportCount}</span>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                <span className="text-slate-400 text-sm block mb-1">Priority</span>
                <span className="text-3xl font-bold text-orange-500">HIGH</span>
              </div>
            </div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-10 flex gap-4 justify-center flex-wrap">
              {signal?.id && (
                <Link href={`/admin/issues/${signal.id}`} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold text-lg">
                  Investigate Cluster
                </Link>
              )}
              <Link href="/auth/login" className="px-8 py-4 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-lg">
                Open Admin Dashboard
              </Link>
            </motion.div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
