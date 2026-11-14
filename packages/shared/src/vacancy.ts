import { z } from 'zod';
import { CURRENCIES, VACANCY_STATUSES } from './constants';

export const vacancyStatusSchema = z.enum(VACANCY_STATUSES);
export const currencySchema = z.enum(CURRENCIES);

const amountSchema = z
  .number({ error: 'Введите число' })
  .int('Введите целое число')
  .nonnegative('Сумма не может быть отрицательной')
  .optional();

export const salaryRangeSchema = z
  .object({
    min: amountSchema,
    max: amountSchema,
    currency: currencySchema,
  })
  .refine(({ min, max }) => min === undefined || max === undefined || min <= max, {
    message: 'Максимум меньше минимума',
    path: ['max'],
  });
export type SalaryRange = z.infer<typeof salaryRangeSchema>;

export const statusChangeSchema = z.object({
  status: vacancyStatusSchema,
  changedAt: z.string(),
});
export type StatusChange = z.infer<typeof statusChangeSchema>;

/**
 * Данные, которые пользователь вводит при создании/редактировании вакансии.
 * Строгая схема: одна и та же проверка работает в форме на фронтенде и в API.
 */
/**
 * Имя хоста ссылки: домен с точкой и буквенной зоной (кириллица приходит как punycode — xn--…).
 * Нужна явная проверка: Chromium разбирает адреса мягче Node и принимает, например, «https://a b»,
 * из-за чего форма пропускала ссылку, а сервер её отклонял.
 */
const HOSTNAME = /^(?:(?!-)[a-z0-9-]{1,63}(?<!-)\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/i;

export const vacancyInputSchema = z.object({
  company: z.string().trim().min(1, 'Укажите компанию').max(200, 'Слишком длинное название'),
  position: z.string().trim().min(1, 'Укажите должность').max(200, 'Слишком длинное название'),
  url: z
    .url({ protocol: /^https?$/, hostname: HOSTNAME, error: 'Некорректная ссылка' })
    .max(2000, 'Слишком длинная ссылка')
    .optional(),
  salary: salaryRangeSchema,
  appliedAt: z.iso.date('Укажите дату'),
  notes: z.string().trim().max(5000, 'Слишком длинные заметки').optional(),
  status: vacancyStatusSchema,
});
export type VacancyInput = z.infer<typeof vacancyInputSchema>;

/** Тело запроса на смену статуса */
export const vacancyStatusUpdateSchema = z.object({ status: vacancyStatusSchema });

/**
 * Перетаскивание в канбане: в какую колонку и после какой карточки поставить.
 * afterId: null — в начало колонки. Сервер сам вычисляет ранг, клиенту не нужно знать чужие ранги.
 */
export const vacancyMoveSchema = z.object({
  status: vacancyStatusSchema,
  afterId: z.uuid().nullable(),
});
export type VacancyMove = z.infer<typeof vacancyMoveSchema>;
export type VacancyStatusUpdate = z.infer<typeof vacancyStatusUpdateSchema>;

/**
 * Сохранённая вакансия. Проверяет только структуру, без бизнес-правил ввода:
 * так ранее сохранённые данные не отбрасываются, если правила формы станут строже.
 */
export const vacancySchema = z.object({
  id: z.string(),
  company: z.string(),
  position: z.string(),
  url: z.string().optional(),
  salary: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    currency: currencySchema,
  }),
  appliedAt: z.string(),
  notes: z.string().optional(),
  status: vacancyStatusSchema,
  statusHistory: z.array(statusChangeSchema),
  /** Порядок внутри колонки канбана: меньше — выше (см. rank.ts) */
  rank: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Vacancy = z.infer<typeof vacancySchema>;
