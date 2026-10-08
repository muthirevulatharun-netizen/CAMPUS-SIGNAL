'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-dark text-white">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center min-h-[80vh] px-4 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-dark to-dark pointer-events-none"></div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="z-10 max-w-4xl"
        >
          <div className="w-24 h-24 mx-auto mb-8 relative">
            <div className="absolute inset-0 bg-indigo-500 rounded-full animate-signal-pulse blur-xl opacity-50"></div>
            <div className="relative flex items-center justify-center w-full h-full bg-indigo-600 rounded-full">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            CAMPUS <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">SIGNAL</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-6 max-w-2xl mx-auto">
            From scattered complaints to clear campus action.
          </p>
          <p className="text-slate-400 mb-10 max-w-2xl mx-auto">
            An intelligent campus operations platform that detects patterns, assigns the right team, and turns noise into actionable signals.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-xs md:text-sm text-slate-400 mb-10 max-w-3xl mx-auto">
            {['Student Reports', 'Signal Engine', 'Underlying Issue', 'Responsible Team', 'Action'].map((step, i, arr) => (
              <span key={step} className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-200">{step}</span>
                {i < arr.length - 1 && <span className="text-indigo-500">→</span>}
              </span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/login" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/30 w-full sm:w-auto">
              Continue with Google
            </Link>
            <Link href="/demo" className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium border border-slate-700 transition-all w-full sm:w-auto">
              View Live Demo
            </Link>
            <Link href="/methodology" className="px-8 py-4 text-slate-300 hover:text-white rounded-lg font-medium border border-transparent hover:border-slate-600 transition-all w-full sm:w-auto">
              How It Works
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Intelligence at Every Step</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Smart Classification", desc: "Automatically categorizes reports by department and severity.", icon: "brain" },
              { title: "Auto Assignment", desc: "Routes issues to the exact right staff member instantly.", icon: "users" },
              { title: "Issue Grouping", desc: "Detects patterns and groups related complaints together.", icon: "network" },
              { title: "Priority Scoring", desc: "Calculates impact and severity to surface critical issues.", icon: "alert-triangle" },
              { title: "Emerging Detection", desc: "Spots growing trends before they become campus-wide problems.", icon: "trending-up" },
              { title: "Real-time Alerts", desc: "Keeps students and staff updated as progress happens.", icon: "bell" }
            ].map((f, i) => (
              <div key={i} className="p-6 rounded-2xl bg-slate-800 border border-slate-700 hover:border-indigo-500 transition-colors">
                <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center mb-4 text-cyan-400">
                  <div className="w-6 h-6 bg-current rounded-full" style={{maskImage: 'url(#)'}}></div>
                </div>
                <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
