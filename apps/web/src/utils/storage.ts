import { vacancySchema, type Vacancy } from '@job-tracker/shared';

export { isCurrency, isVacancyStatus } from '@job-tracker/shared';

/** Возвращает только валидные вакансии; повреждённые записи отбрасываются */
export function parseVacancies(value: unknown): Vacancy[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item: unknown) => {
    const result = vacancySchema.safeParse(item);
    return result.success ? [result.data] : [];
  });
}
