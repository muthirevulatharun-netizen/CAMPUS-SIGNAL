export function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-slate-200 rounded w-1/4"></div>
      <div className="space-y-3">
        <div className="h-24 bg-slate-200 rounded"></div>
        <div className="h-24 bg-slate-200 rounded"></div>
        <div className="h-24 bg-slate-200 rounded"></div>
      </div>
    </div>
  );
}
