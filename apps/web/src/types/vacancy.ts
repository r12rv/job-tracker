import type { Currency, VacancyStatus } from '@job-tracker/shared';

// Доменные типы выводятся из Zod-схем общего пакета — единый источник правды для фронтенда и API
export {
  CURRENCIES,
  VACANCY_STATUSES,
  type Currency,
  type SalaryRange,
  type StatusChange,
  type Vacancy,
  type VacancyInput,
  type VacancyStatus,
} from '@job-tracker/shared';

/** Данные формы: все поля — строки, как их отдают input'ы */
export interface VacancyFormValues {
  company: string;
  position: string;
  url: string;
  salaryMin: string;
  salaryMax: string;
  currency: Currency;
  appliedAt: string;
  notes: string;
  status: VacancyStatus;
}

export type StatusFilter = VacancyStatus | 'all';

export interface VacancyFilters {
  status: StatusFilter;
  search: string;
}

export type ViewMode = 'kanban' | 'table';

export interface VacancyStats {
  total: number;
  reachedInterview: number;
  interviewRate: number;
  offers: number;
  active: number;
}
