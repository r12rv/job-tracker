import { CURRENCIES, VACANCY_STATUSES } from '@job-tracker/shared';
import { relations, sql } from 'drizzle-orm';
import { check, date, index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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
    company: text('company').notNull(),
    position: text('position').notNull(),
    url: text('url'),
    salaryMin: integer('salary_min'),
    salaryMax: integer('salary_max'),
    currency: currency('currency').notNull().default('RUB'),
    appliedAt: date('applied_at', { mode: 'string' }).notNull(),
    notes: text('notes'),
    status: vacancyStatus('status').notNull(),
    ...timestamps,
  },
  (table) => [
    index('vacancies_applied_at_idx').on(table.appliedAt),
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

export const vacanciesRelations = relations(vacancies, ({ many }) => ({
  statusHistory: many(vacancyStatusChanges),
}));

export const vacancyStatusChangesRelations = relations(vacancyStatusChanges, ({ one }) => ({
  vacancy: one(vacancies, { fields: [vacancyStatusChanges.vacancyId], references: [vacancies.id] }),
}));
