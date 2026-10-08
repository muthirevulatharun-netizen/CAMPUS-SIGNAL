'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  trend?: string;
  subtitle?: string;
}

export function KpiCard({ title, value, icon: Icon, color, trend, subtitle }: KpiCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const numericValue = typeof value === 'number' ? value : parseFloat(value as string) || 0;
  const isNumeric = typeof value === 'number' || !isNaN(parseFloat(value as string));

  useEffect(() => {
    if (!isNumeric) return;
    let start = 0;
    const duration = 1000;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      setDisplayValue(Math.floor(progress * numericValue));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(numericValue);
      }
    };
    requestAnimationFrame(animate);
  }, [numericValue, isNumeric]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-500">{title}</h3>
        <div className={`p-2 rounded-lg ${color} bg-opacity-10 text-opacity-90`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-slate-900 count-up">
          {isNumeric ? displayValue : value}
        </span>
        {trend && (
          <span className={`text-sm font-medium ${trend.startsWith('↑') ? 'text-red-600' : 'text-green-600'}`}>
            {trend}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </motion.div>
  );
}
