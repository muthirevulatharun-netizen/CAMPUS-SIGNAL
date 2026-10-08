import { LucideIcon } from 'lucide-react';

export function EmptyState({ icon: Icon, title, message, action }: { icon: LucideIcon, title: string, message: string, action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white rounded-xl border border-slate-200 border-dashed">
      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-slate-400" />
      </div>
      <h3 className="text-lg font-medium text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">{message}</p>
      {action}
    </div>
  );
}
