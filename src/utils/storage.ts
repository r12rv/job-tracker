import {
  CURRENCIES,
  VACANCY_STATUSES,
  type Currency,
  type SalaryRange,
  type StatusChange,
  type Vacancy,
  type VacancyStatus,
} from '../types/vacancy';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value));
}

export function isVacancyStatus(value: unknown): value is VacancyStatus {
  return typeof value === 'string' && (VACANCY_STATUSES as readonly string[]).includes(value);
}

export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && (CURRENCIES as readonly string[]).includes(value);
}

function isSalaryRange(value: unknown): value is SalaryRange {
  return (
    isRecord(value) &&
    isCurrency(value.currency) &&
    isOptionalNumber(value.min) &&
    isOptionalNumber(value.max)
  );
}

function isStatusChange(value: unknown): value is StatusChange {
  return isRecord(value) && isVacancyStatus(value.status) && typeof value.changedAt === 'string';
}

export function isVacancy(value: unknown): value is Vacancy {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.company === 'string' &&
    typeof value.position === 'string' &&
    isOptionalString(value.url) &&
    isSalaryRange(value.salary) &&
    typeof value.appliedAt === 'string' &&
    isOptionalString(value.notes) &&
    isVacancyStatus(value.status) &&
    Array.isArray(value.statusHistory) &&
    value.statusHistory.every(isStatusChange) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

/** Возвращает только валидные вакансии; повреждённые записи отбрасываются */
export function parseVacancies(value: unknown): Vacancy[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isVacancy);
}
