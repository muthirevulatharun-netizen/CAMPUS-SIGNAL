import { AlertTriangle, AlertCircle, ArrowUpCircle, CheckCircle2 } from 'lucide-react';

const priorityConfig = {
  low: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2, dot: 'bg-green-500' },
  medium: { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: ArrowUpCircle, dot: 'bg-amber-500' },
  high: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertCircle, dot: 'bg-orange-500' },
  critical: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle, dot: 'bg-red-500' },
};

export function PriorityBadge({ priority = 'low' }: { priority: string }) {
  const config = priorityConfig[priority.toLowerCase() as keyof typeof priorityConfig] || priorityConfig.low;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
      {priority.toUpperCase()}
    </span>
  );
}
