import { z } from 'zod';

export const VACANCY_STATUSES = ['applied', 'test', 'interview', 'offer', 'rejected'] as const;
export const vacancyStatusSchema = z.enum(VACANCY_STATUSES);
export type VacancyStatus = z.infer<typeof vacancyStatusSchema>;

export const CURRENCIES = ['RUB', 'USD', 'EUR'] as const;
export const currencySchema = z.enum(CURRENCIES);
export type Currency = z.infer<typeof currencySchema>;

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
export const vacancyInputSchema = z.object({
  company: z.string().trim().min(1, 'Укажите компанию').max(200, 'Слишком длинное название'),
  position: z.string().trim().min(1, 'Укажите должность').max(200, 'Слишком длинное название'),
  url: z
    .url({ protocol: /^https?$/, error: 'Некорректная ссылка' })
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

export function isVacancyStatus(value: unknown): value is VacancyStatus {
  return vacancyStatusSchema.safeParse(value).success;
}

export function isCurrency(value: unknown): value is Currency {
  return currencySchema.safeParse(value).success;
}
