import type { VacancyStats } from '../../types/vacancy';
import { pluralize } from '../../utils/format';
import { StatCard } from './StatCard';

interface StatsPanelProps {
  stats: VacancyStats;
}

export function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Всего откликов"
        value={String(stats.total)}
        hint={`${stats.active} ${pluralize(stats.active, 'активный', 'активных', 'активных')}`}
      />
      <StatCard
        label="Дошли до собеседования"
        value={String(stats.reachedInterview)}
        accent="text-amber-600"
      />
      <StatCard
        label="Процент приглашений"
        value={`${stats.interviewRate}%`}
        hint="собеседования / отклики"
        accent="text-indigo-600"
      />
      <StatCard label="Офферы" value={String(stats.offers)} accent="text-emerald-600" />
    </dl>
  );
}
