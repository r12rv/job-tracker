import { CURRENCIES, VACANCY_STATUSES } from '@job-tracker/shared';
import { relations, sql } from 'drizzle-orm';
import { check, date, doublePrecision, index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth-schema';

export * from './auth-schema';

// Значения перечислений берутся из общего пакета — база и Zod-схемы не разойдутся
export const vacancyStatus = pgEnum('vacancy_status', VACANCY_STATUSES);
export const currency = pgEnum('currency', CURRENCIES);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
};

export const vacancies = pgTable(
  'vacancies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Владелец вакансии: каждый пользователь видит и меняет только свои
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    company: text('company').notNull(),
    position: text('position').notNull(),
    url: text('url'),
    salaryMin: integer('salary_min'),
    salaryMax: integer('salary_max'),
    currency: currency('currency').notNull().default('RUB'),
    appliedAt: date('applied_at', { mode: 'string' }).notNull(),
    notes: text('notes'),
    status: vacancyStatus('status').notNull(),
    // Порядок в колонке канбана: дробный ранг, меньше — выше (packages/shared/src/rank.ts)
    rank: doublePrecision('rank').notNull().default(0),
    ...timestamps,
  },
  (table) => [
    // Основной запрос — «вакансии пользователя, новые первыми»
    index('vacancies_user_id_applied_at_idx').on(table.userId, table.appliedAt),
    // Колонка канбана по порядку: при перетаскивании ищем соседей и блокируем колонку
    index('vacancies_user_id_status_rank_idx').on(table.userId, table.status, table.rank),
    // Дублируем ключевые правила Zod на уровне базы: данные корректны, даже если их запишут в обход API
    check('vacancies_salary_non_negative', sql`${table.salaryMin} >= 0 AND ${table.salaryMax} >= 0`),
    check(
      'vacancies_salary_range',
      sql`${table.salaryMin} IS NULL OR ${table.salaryMax} IS NULL OR ${table.salaryMin} <= ${table.salaryMax}`,
    ),
  ],
);

/** История смены статусов — отдельная таблица, по строке на каждое изменение */
export const vacancyStatusChanges = pgTable(
  'vacancy_status_changes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    vacancyId: uuid('vacancy_id')
      .notNull()
      .references(() => vacancies.id, { onDelete: 'cascade' }),
    status: vacancyStatus('status').notNull(),
    changedAt: timestamp('changed_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => [index('vacancy_status_changes_vacancy_id_idx').on(table.vacancyId, table.changedAt)],
);

export const vacanciesRelations = relations(vacancies, ({ many, one }) => ({
  owner: one(user, { fields: [vacancies.userId], references: [user.id] }),
  statusHistory: many(vacancyStatusChanges),
}));

export const vacancyStatusChangesRelations = relations(vacancyStatusChanges, ({ one }) => ({
  vacancy: one(vacancies, { fields: [vacancyStatusChanges.vacancyId], references: [vacancies.id] }),
}));
