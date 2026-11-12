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
    badge: 'bg-sky-50 text-sky-700 ring-sky-600/20',
    dot: 'bg-sky-500',
  },
  test: {
    label: 'Тестовое',
    badge: 'bg-violet-50 text-violet-700 ring-violet-600/20',
    dot: 'bg-violet-500',
  },
  interview: {
    label: 'Собеседование',
    badge: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    dot: 'bg-amber-500',
  },
  offer: {
    label: 'Оффер',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'Отказ',
    badge: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    dot: 'bg-rose-500',
  },
};

/** Статусы, которые означают, что кандидат дошёл до собеседования */
export const INTERVIEW_OR_LATER: readonly VacancyStatus[] = ['interview', 'offer'];
