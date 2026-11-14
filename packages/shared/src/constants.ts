/*
 * Справочники без Zod. Стартовой странице нужны только они, а схемы с Zod — лишь форме и API:
 * вместе с "sideEffects": false в package.json это не даёт Zod попасть в стартовый бандл.
 */

export const VACANCY_STATUSES = ['applied', 'test', 'interview', 'offer', 'rejected'] as const;
export type VacancyStatus = (typeof VACANCY_STATUSES)[number];

export const CURRENCIES = ['RUB', 'USD', 'EUR'] as const;
export type Currency = (typeof CURRENCIES)[number];

export function isVacancyStatus(value: unknown): value is VacancyStatus {
  return (VACANCY_STATUSES as readonly unknown[]).includes(value);
}

export function isCurrency(value: unknown): value is Currency {
  return (CURRENCIES as readonly unknown[]).includes(value);
}
