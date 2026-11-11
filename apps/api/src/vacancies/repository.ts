import type { Vacancy, VacancyInput, VacancyStatus } from '@job-tracker/shared';
import { asc, desc, eq, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { vacancies, vacancyStatusChanges } from '../db/schema';

type VacancyRow = typeof vacancies.$inferSelect;
type StatusChangeRow = typeof vacancyStatusChanges.$inferSelect;

/** Postgres отдаёт timestamptz как «2026-11-11 10:00:00+00» — приводим к ISO, как во фронтенде */
function toIso(timestamp: string): string {
  return new Date(timestamp).toISOString();
}

/** Строка базы → доменный объект в формате общей схемы (null → отсутствующее поле) */
function toVacancy(row: VacancyRow & { statusHistory: StatusChangeRow[] }): Vacancy {
  return {
    id: row.id,
    company: row.company,
    position: row.position,
    ...(row.url !== null && { url: row.url }),
    salary: {
      ...(row.salaryMin !== null && { min: row.salaryMin }),
      ...(row.salaryMax !== null && { max: row.salaryMax }),
      currency: row.currency,
    },
    appliedAt: row.appliedAt,
    ...(row.notes !== null && { notes: row.notes }),
    status: row.status,
    statusHistory: row.statusHistory.map((change) => ({
      status: change.status,
      changedAt: toIso(change.changedAt),
    })),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

/** Доменный ввод → колонки таблицы */
function toColumns(input: VacancyInput) {
  return {
    company: input.company,
    position: input.position,
    url: input.url ?? null,
    salaryMin: input.salary.min ?? null,
    salaryMax: input.salary.max ?? null,
    currency: input.salary.currency,
    appliedAt: input.appliedAt,
    notes: input.notes ?? null,
    status: input.status,
  };
}

const withHistory = {
  statusHistory: { orderBy: [asc(vacancyStatusChanges.changedAt)] },
};

export function createVacancyRepository(db: Db) {
  async function findById(id: string): Promise<Vacancy | undefined> {
    const row = await db.query.vacancies.findFirst({
      where: eq(vacancies.id, id),
      with: withHistory,
    });
    return row && toVacancy(row);
  }

  return {
    findById,

    async list(): Promise<Vacancy[]> {
      const rows = await db.query.vacancies.findMany({
        with: withHistory,
        orderBy: [desc(vacancies.appliedAt), desc(vacancies.createdAt)],
      });
      return rows.map(toVacancy);
    },

    async create(input: VacancyInput): Promise<Vacancy> {
      const id = await db.transaction(async (tx) => {
        const [created] = await tx.insert(vacancies).values(toColumns(input)).returning({ id: vacancies.id });
        if (!created) throw new Error('Insert returned no rows');
        await tx.insert(vacancyStatusChanges).values({ vacancyId: created.id, status: input.status });
        return created.id;
      });
      const vacancy = await findById(id);
      if (!vacancy) throw new Error('Created vacancy not found');
      return vacancy;
    },

    /** Полное обновление. Смена статуса дописывается в историю */
    async update(id: string, input: VacancyInput): Promise<Vacancy | undefined> {
      const updated = await db.transaction(async (tx) => {
        const [current] = await tx
          .select({ status: vacancies.status })
          .from(vacancies)
          .where(eq(vacancies.id, id))
          .for('update');
        if (!current) return false;

        await tx
          .update(vacancies)
          .set({ ...toColumns(input), updatedAt: sql`now()` })
          .where(eq(vacancies.id, id));
        if (current.status !== input.status) {
          await tx.insert(vacancyStatusChanges).values({ vacancyId: id, status: input.status });
        }
        return true;
      });
      return updated ? findById(id) : undefined;
    },

    async setStatus(id: string, status: VacancyStatus): Promise<Vacancy | undefined> {
      const updated = await db.transaction(async (tx) => {
        const [current] = await tx
          .select({ status: vacancies.status })
          .from(vacancies)
          .where(eq(vacancies.id, id))
          .for('update');
        if (!current) return false;
        if (current.status === status) return true;

        await tx.update(vacancies).set({ status, updatedAt: sql`now()` }).where(eq(vacancies.id, id));
        await tx.insert(vacancyStatusChanges).values({ vacancyId: id, status });
        return true;
      });
      return updated ? findById(id) : undefined;
    },

    async remove(id: string): Promise<boolean> {
      const deleted = await db.delete(vacancies).where(eq(vacancies.id, id)).returning({ id: vacancies.id });
      return deleted.length > 0;
    },
  };
}

export type VacancyRepository = ReturnType<typeof createVacancyRepository>;
