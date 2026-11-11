import { vacancyInputSchema } from '@job-tracker/shared';
import type { VacancyFormValues, VacancyInput } from '../types/vacancy';

export type FormErrors = Partial<Record<keyof VacancyFormValues, string>>;

type AmountParseResult = { ok: true; value: number | undefined } | { ok: false };

/** Строка из input → число. Пробелы-разделители и запятая допускаются */
function parseAmount(raw: string): AmountParseResult {
  const cleaned = raw.replace(/\s/g, '').replace(',', '.');
  if (cleaned === '') return { ok: true, value: undefined };
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return { ok: false };
  return { ok: true, value: Math.round(value) };
}

/** Добавляет https://, если пользователь вставил ссылку без протокола */
function normalizeUrl(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Путь ошибки в схеме → поле формы */
function fieldForPath(path: readonly PropertyKey[]): keyof VacancyFormValues | undefined {
  const [head, nested] = path;
  if (head === 'salary') {
    if (nested === 'min') return 'salaryMin';
    if (nested === 'max') return 'salaryMax';
    return 'salaryMax';
  }
  switch (head) {
    case 'company':
    case 'position':
    case 'url':
    case 'appliedAt':
    case 'notes':
    case 'status':
      return head;
    default:
      return undefined;
  }
}

export type ValidationResult = { ok: true; data: VacancyInput } | { ok: false; errors: FormErrors };

export function validateVacancyForm(values: VacancyFormValues): ValidationResult {
  const errors: FormErrors = {};

  const min = parseAmount(values.salaryMin);
  const max = parseAmount(values.salaryMax);
  if (!min.ok) errors.salaryMin = 'Введите число';
  if (!max.ok) errors.salaryMax = 'Введите число';

  const notes = values.notes.trim();
  const result = vacancyInputSchema.safeParse({
    company: values.company,
    position: values.position,
    url: normalizeUrl(values.url),
    salary: {
      min: min.ok ? min.value : undefined,
      max: max.ok ? max.value : undefined,
      currency: values.currency,
    },
    appliedAt: values.appliedAt,
    notes: notes === '' ? undefined : notes,
    status: values.status,
  });

  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = fieldForPath(issue.path);
      // Первая ошибка поля важнее последующих; ошибки разбора чисел уже выставлены выше
      if (field && errors[field] === undefined) errors[field] = issue.message;
    }
  }

  if (!result.success || Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: result.data };
}
