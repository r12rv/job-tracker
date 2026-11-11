import type { Currency, SalaryRange } from '../types/vacancy';

const CURRENCY_SIGN: Record<Currency, string> = {
  RUB: '₽',
  USD: '$',
  EUR: '€',
};

const numberFormatter = new Intl.NumberFormat('ru-RU');

export function formatSalary(salary: SalaryRange): string {
  const sign = CURRENCY_SIGN[salary.currency];
  const { min, max } = salary;

  if (min !== undefined && max !== undefined) {
    if (min === max) return `${numberFormatter.format(min)} ${sign}`;
    return `${numberFormatter.format(min)} – ${numberFormatter.format(max)} ${sign}`;
  }
  if (min !== undefined) return `от ${numberFormatter.format(min)} ${sign}`;
  if (max !== undefined) return `до ${numberFormatter.format(max)} ${sign}`;
  return '—';
}

export function currencySign(currency: Currency): string {
  return CURRENCY_SIGN[currency];
}

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** Принимает YYYY-MM-DD и форматирует без сдвига часового пояса */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return dateFormatter.format(new Date(year, month - 1, day));
}

/** Сегодняшняя дата в формате YYYY-MM-DD по локальному времени */
export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function pluralize(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
