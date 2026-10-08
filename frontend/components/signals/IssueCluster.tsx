'use client';
import { motion } from 'framer-motion';

type Node = { id: string; title: string };

export function IssueCluster({ centerTitle, complaints }: { centerTitle: string; complaints: Node[] }) {
  const nodes = complaints.slice(0, 6);
  const positions = [
    { top: '8%', left: '12%' },
    { top: '5%', right: '10%' },
    { top: '42%', left: '2%' },
    { top: '40%', right: '2%' },
    { bottom: '12%', left: '18%' },
    { bottom: '10%', right: '14%' },
  ];

  return (
    <div className="relative min-h-[320px] w-full">
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
        {nodes.map((_, i) => (
          <motion.line
            key={i}
            x1="50%"
            y1="50%"
            x2={`${i % 2 === 0 ? 20 : 80}%`}
            y2={`${15 + i * 12}%`}
            stroke="#6366F1"
            strokeWidth="1"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, delay: i * 0.15 }}
          />
        ))}
      </svg>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-40 h-40 rounded-full bg-red-600/90 flex flex-col items-center justify-center text-center px-3 shadow-[0_0_40px_rgba(239,68,68,0.45)] border border-red-400/50"
        >
          <span className="text-[10px] uppercase tracking-wider text-red-100">Central Signal</span>
          <span className="text-sm font-bold leading-tight mt-1">{centerTitle}</span>
        </motion.div>
      </div>

      {nodes.map((c, i) => (
        <motion.div
          key={c.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + i * 0.1 }}
          className="absolute max-w-[140px] bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-200"
          style={positions[i]}
        >
          {c.title}
        </motion.div>
      ))}
    </div>
  );
}
