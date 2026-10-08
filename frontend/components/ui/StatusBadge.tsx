const statusConfig = {
  submitted: 'bg-slate-100 text-slate-800 border-slate-200',
  assigned: 'bg-blue-100 text-blue-800 border-blue-200',
  acknowledged: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  investigating: 'bg-violet-100 text-violet-800 border-violet-200',
  action_taken: 'bg-amber-100 text-amber-800 border-amber-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
  closed: 'bg-gray-100 text-gray-800 border-gray-200',
};

export function StatusBadge({ status = 'submitted' }: { status: string }) {
  const colorClass = statusConfig[status.toLowerCase() as keyof typeof statusConfig] || statusConfig.submitted;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
}
