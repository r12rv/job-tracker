import type { VacancyFormValues, VacancyInput } from '../types/vacancy';

export type FormErrors = Partial<Record<keyof VacancyFormValues, string>>;

function parseAmount(raw: string): number | undefined | null {
  const cleaned = raw.replace(/\s/g, '').replace(',', '.');
  if (cleaned === '') return undefined;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

function isValidUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Добавляет https://, если пользователь вставил ссылку без протокола */
function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === '') return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export type ValidationResult =
  | { ok: true; data: VacancyInput }
  | { ok: false; errors: FormErrors };

export function validateVacancyForm(values: VacancyFormValues): ValidationResult {
  const errors: FormErrors = {};

  const company = values.company.trim();
  const position = values.position.trim();
  const url = normalizeUrl(values.url);
  const notes = values.notes.trim();
  const min = parseAmount(values.salaryMin);
  const max = parseAmount(values.salaryMax);

  if (company === '') errors.company = 'Укажите компанию';
  if (position === '') errors.position = 'Укажите должность';
  if (url !== '' && !isValidUrl(url)) errors.url = 'Некорректная ссылка';
  if (min === null) errors.salaryMin = 'Введите число';
  if (max === null) errors.salaryMax = 'Введите число';
  if (typeof min === 'number' && typeof max === 'number' && min > max) {
    errors.salaryMax = 'Максимум меньше минимума';
  }
  if (values.appliedAt === '') errors.appliedAt = 'Укажите дату';

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      company,
      position,
      url: url || undefined,
      salary: {
        min: min ?? undefined,
        max: max ?? undefined,
        currency: values.currency,
      },
      appliedAt: values.appliedAt,
      notes: notes || undefined,
      status: values.status,
    },
  };
}
