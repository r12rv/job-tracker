import type { VacancyStatus } from '../types/vacancy';

export interface StatusMeta {
  label: string;
  /** Классы бейджа */
  badge: string;
  /** Цвет точки / акцента колонки */
  dot: string;
}

export const STATUS_META: Record<VacancyStatus, StatusMeta> = {
  applied: {
    label: 'Отклик',
    badge: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-sky-600/20 dark:ring-sky-400/30',
    dot: 'bg-sky-500',
  },
  test: {
    label: 'Тестовое',
    badge: 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-violet-600/20 dark:ring-violet-400/30',
    dot: 'bg-violet-500',
  },
  interview: {
    label: 'Собеседование',
    badge: 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 ring-amber-600/20 dark:ring-amber-400/30',
    dot: 'bg-amber-500',
  },
  offer: {
    label: 'Оффер',
    badge: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-600/20 dark:ring-emerald-400/30',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'Отказ',
    badge: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-600/20 dark:ring-rose-400/30',
    dot: 'bg-rose-500',
  },
};

/** Статусы, которые означают, что кандидат дошёл до собеседования */
export const INTERVIEW_OR_LATER: readonly VacancyStatus[] = ['interview', 'offer'];
