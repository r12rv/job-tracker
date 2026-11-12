import { evenRanks, rankBetween, type Vacancy, type VacancyInput, type VacancyMove, type VacancyStatus } from '@job-tracker/shared';
import { and, asc, desc, eq, min, or, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { vacancies, vacancyStatusChanges } from '../db/schema';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
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
    rank: row.rank,
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

/** Условие «вакансия с этим id принадлежит этому пользователю» */
function owned(userId: string, id: string) {
  return and(eq(vacancies.id, id), eq(vacancies.userId, userId));
}

/** Ранг для карточки в самом верху колонки: новые и перенесённые вакансии появляются первыми */
async function topRank(tx: Tx, userId: string, status: VacancyStatus): Promise<number> {
  const [result] = await tx
    .select({ min: min(vacancies.rank) })
    .from(vacancies)
    .where(and(eq(vacancies.userId, userId), eq(vacancies.status, status)));
  return rankBetween(undefined, result?.min ?? undefined) ?? 0;
}

export type MoveResult = { ok: true; vacancy: Vacancy } | { ok: false; reason: 'not_found' | 'conflict' };

/**
 * Все методы принимают userId и работают только с вакансиями этого пользователя.
 * Чужая вакансия неотличима от несуществующей (404, а не 403) — так нельзя даже узнать, что она есть.
 */
export function createVacancyRepository(db: Db) {
  async function findById(userId: string, id: string): Promise<Vacancy | undefined> {
    const row = await db.query.vacancies.findFirst({
      where: owned(userId, id),
      with: withHistory,
    });
    return row && toVacancy(row);
  }

  /** Блокирует строку до конца транзакции и возвращает текущий статус, если вакансия своя */
  async function lockOwned(tx: Tx, userId: string, id: string) {
    const [current] = await tx
      .select({ status: vacancies.status })
      .from(vacancies)
      .where(owned(userId, id))
      .for('update');
    return current;
  }

  return {
    findById,

    async list(userId: string): Promise<Vacancy[]> {
      const rows = await db.query.vacancies.findMany({
        where: eq(vacancies.userId, userId),
        with: withHistory,
        orderBy: [desc(vacancies.appliedAt), desc(vacancies.createdAt)],
      });
      return rows.map(toVacancy);
    },

    async create(userId: string, input: VacancyInput): Promise<Vacancy> {
      const id = await db.transaction(async (tx) => {
        const rank = await topRank(tx, userId, input.status);
        const [created] = await tx
          .insert(vacancies)
          .values({ ...toColumns(input), userId, rank })
          .returning({ id: vacancies.id });
        if (!created) throw new Error('Insert returned no rows');
        await tx.insert(vacancyStatusChanges).values({ vacancyId: created.id, status: input.status });
        return created.id;
      });
      const vacancy = await findById(userId, id);
      if (!vacancy) throw new Error('Created vacancy not found');
      return vacancy;
    },

    /** Полное обновление. Смена статуса дописывается в историю */
    async update(userId: string, id: string, input: VacancyInput): Promise<Vacancy | undefined> {
      const updated = await db.transaction(async (tx) => {
        const current = await lockOwned(tx, userId, id);
        if (!current) return false;

        const statusChanged = current.status !== input.status;
        // Сменили статус в форме — карточка встаёт наверх новой колонки, иначе остаётся на месте
        const rank = statusChanged ? await topRank(tx, userId, input.status) : undefined;
        await tx
          .update(vacancies)
          .set({ ...toColumns(input), ...(rank !== undefined && { rank }), updatedAt: sql`now()` })
          .where(owned(userId, id));
        if (statusChanged) {
          await tx.insert(vacancyStatusChanges).values({ vacancyId: id, status: input.status });
        }
        return true;
      });
      return updated ? findById(userId, id) : undefined;
    },

    async setStatus(userId: string, id: string, status: VacancyStatus): Promise<Vacancy | undefined> {
      const updated = await db.transaction(async (tx) => {
        const current = await lockOwned(tx, userId, id);
        if (!current) return false;
        if (current.status === status) return true;

        const rank = await topRank(tx, userId, status);
        await tx.update(vacancies).set({ status, rank, updatedAt: sql`now()` }).where(owned(userId, id));
        await tx.insert(vacancyStatusChanges).values({ vacancyId: id, status });
        return true;
      });
      return updated ? findById(userId, id) : undefined;
    },

    /**
     * Перетаскивание: ставит вакансию в колонку `status` сразу после `afterId` (null — в начало).
     * Колонка блокируется до конца транзакции, поэтому одновременные перетаскивания не перемешают порядок.
     * conflict — если afterId уже нет в этой колонке (удалили или перенесли с другого устройства).
     */
    async move(userId: string, id: string, { status, afterId }: VacancyMove): Promise<MoveResult> {
      const outcome = await db.transaction(async (tx): Promise<'moved' | 'not_found' | 'conflict'> => {
        // Одним запросом блокируем и саму карточку, и колонку назначения, в порядке id:
        // два одновременных перетаскивания не смогут заблокировать друг друга (deadlock)
        const rows = await tx
          .select({ id: vacancies.id, status: vacancies.status, rank: vacancies.rank, createdAt: vacancies.createdAt })
          .from(vacancies)
          .where(and(eq(vacancies.userId, userId), or(eq(vacancies.id, id), eq(vacancies.status, status))))
          .orderBy(asc(vacancies.id))
          .for('update');

        const current = rows.find((row) => row.id === id);
        if (!current) return 'not_found';
        if (afterId === id) return 'conflict';

        // Колонка назначения без самой карточки — в том порядке, в каком её видит пользователь
        const column = rows
          .filter((row) => row.id !== id && row.status === status)
          .sort((a, b) => a.rank - b.rank || b.createdAt.localeCompare(a.createdAt));

        const index = afterId === null ? -1 : column.findIndex((item) => item.id === afterId);
        if (afterId !== null && index === -1) return 'conflict';

        let rank = rankBetween(column[index]?.rank, column[index + 1]?.rank);
        if (rank === null) {
          // Между соседями не осталось места — перенумеровываем колонку и считаем заново
          const ranks = evenRanks(column.length);
          for (const [position, item] of column.entries()) {
            const next = ranks[position] ?? 0;
            item.rank = next;
            await tx.update(vacancies).set({ rank: next }).where(eq(vacancies.id, item.id));
          }
          rank = rankBetween(column[index]?.rank, column[index + 1]?.rank) ?? 0;
        }

        await tx.update(vacancies).set({ status, rank, updatedAt: sql`now()` }).where(owned(userId, id));
        if (current.status !== status) {
          await tx.insert(vacancyStatusChanges).values({ vacancyId: id, status });
        }
        return 'moved';
      });
      if (outcome !== 'moved') return { ok: false, reason: outcome };
      const vacancy = await findById(userId, id);
      return vacancy ? { ok: true, vacancy } : { ok: false, reason: 'not_found' };
    },

    async remove(userId: string, id: string): Promise<boolean> {
      const deleted = await db.delete(vacancies).where(owned(userId, id)).returning({ id: vacancies.id });
      return deleted.length > 0;
    },
  };
}

export type VacancyRepository = ReturnType<typeof createVacancyRepository>;
