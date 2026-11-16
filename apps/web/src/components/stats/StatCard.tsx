interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}

export function StatCard({ label, value, hint, accent = 'text-slate-900 dark:text-slate-100' }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">{label}</dt>
      <dd className={`mt-1 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl ${accent}`}>{value}</dd>
      {hint && <dd className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</dd>}
    </div>
  );
}
