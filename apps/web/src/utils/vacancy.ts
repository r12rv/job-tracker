import { evenRanks, rankBetween } from '@job-tracker/shared';
import type { Vacancy, VacancyStatus } from '../types/vacancy';

/** Порядок карточек в колонке канбана: по рангу, при равенстве — новые выше (как на сервере) */
export function compareByRank(a: Vacancy, b: Vacancy): number {
  return a.rank - b.rank || b.createdAt.localeCompare(a.createdAt);
}

/**
 * Перемещает вакансию в колонку `status` сразу после `afterId` (null — в начало) и возвращает новый список.
 * Повторяет логику сервера: дробный ранг между соседями, при нехватке места — перенумерация колонки,
 * при смене колонки — запись в истории статусов. Используется для оптимистичного обновления и в демо.
 */
export function applyMove(
  list: readonly Vacancy[],
  id: string,
  status: VacancyStatus,
  afterId: string | null,
  now = new Date().toISOString(),
): Vacancy[] {
  const moving = list.find((vacancy) => vacancy.id === id);
  if (!moving) return [...list];

  const column = list.filter((vacancy) => vacancy.id !== id && vacancy.status === status).sort(compareByRank);
  const index = afterId === null ? -1 : column.findIndex((vacancy) => vacancy.id === afterId);
  // Соседа не нашли (его успели удалить) — ставим в начало, сервер потом поправит
  const position = afterId !== null && index === -1 ? -1 : index;

  const newRanks = new Map<string, number>();
  let rank = rankBetween(column[position]?.rank, column[position + 1]?.rank);
  if (rank === null) {
    const ranks = evenRanks(column.length);
    column.forEach((vacancy, i) => newRanks.set(vacancy.id, ranks[i] ?? 0));
    rank = rankBetween(ranks[position], ranks[position + 1]) ?? 0;
  }

  const statusChanged = moving.status !== status;
  const moved: Vacancy = {
    ...moving,
    status,
    rank,
    statusHistory: statusChanged ? [...moving.statusHistory, { status, changedAt: now }] : moving.statusHistory,
    updatedAt: now,
  };

  return list.map((vacancy) => {
    if (vacancy.id === id) return moved;
    const renumbered = newRanks.get(vacancy.id);
    return renumbered === undefined ? vacancy : { ...vacancy, rank: renumbered };
  });
}
