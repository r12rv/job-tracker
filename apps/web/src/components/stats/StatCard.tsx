interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}

export function StatCard({ label, value, hint, accent = 'text-slate-900' }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <dt className="text-xs font-medium text-slate-500 sm:text-sm">{label}</dt>
      <dd className={`mt-1 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl ${accent}`}>{value}</dd>
      {hint && <dd className="mt-0.5 text-xs text-slate-400">{hint}</dd>}
    </div>
  );
}
