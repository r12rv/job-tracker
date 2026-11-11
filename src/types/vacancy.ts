export const VACANCY_STATUSES = ['applied', 'test', 'interview', 'offer', 'rejected'] as const;
export type VacancyStatus = (typeof VACANCY_STATUSES)[number];

export const CURRENCIES = ['RUB', 'USD', 'EUR'] as const;
export type Currency = (typeof CURRENCIES)[number];

export interface SalaryRange {
  min?: number;
  max?: number;
  currency: Currency;
}

export interface StatusChange {
  status: VacancyStatus;
  changedAt: string;
}

export interface Vacancy {
  id: string;
  company: string;
  position: string;
  url?: string;
  salary: SalaryRange;
  /** Дата отклика в формате YYYY-MM-DD */
  appliedAt: string;
  notes?: string;
  status: VacancyStatus;
  statusHistory: StatusChange[];
  createdAt: string;
  updatedAt: string;
}

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

/** Нормализованные данные, которые форма отдаёт наружу */
export interface VacancyInput {
  company: string;
  position: string;
  url?: string;
  salary: SalaryRange;
  appliedAt: string;
  notes?: string;
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
