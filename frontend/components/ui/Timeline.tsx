'use client';
import { format } from 'date-fns';
import { StatusHistory } from '@/lib/types';

export function Timeline({ items }: { items: StatusHistory[] }) {
  if (!items?.length) {
    return <p className="text-sm text-slate-500">No activity recorded yet.</p>;
  }

  const sorted = [...items].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <ol className="relative border-l border-slate-200 ml-3 space-y-6">
      {sorted.map((item) => (
        <li key={item.id} className="ml-6">
          <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-white" />
          <time className="text-xs text-slate-500">{format(new Date(item.created_at), 'MMM d, HH:mm')}</time>
          <p className="text-sm font-medium text-slate-900 mt-0.5">
            {item.old_status ? `${item.old_status.replace(/_/g, ' ')} → ${item.new_status.replace(/_/g, ' ')}` : item.new_status.replace(/_/g, ' ')}
          </p>
          {item.comment && <p className="text-sm text-slate-600 mt-1">{item.comment}</p>}
        </li>
      ))}
    </ol>
  );
}
