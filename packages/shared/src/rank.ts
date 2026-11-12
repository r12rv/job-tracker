/**
 * Порядок карточек в колонке канбана — дробные «ранги» (fractional indexing).
 *
 * Карточки сортируются по rank по возрастанию. Чтобы вставить карточку между соседями,
 * ей дают число посередине — остальные карточки колонки не трогаются, а значит,
 * перетаскивание обновляет в базе одну строку, а не всю колонку.
 *
 * Делить пополам бесконечно нельзя: точность double закончится примерно через 50 вставок
 * в одно и то же место. Тогда функция возвращает null, и вызывающий код
 * перенумеровывает колонку заново (0, 1, 2…) — это редкий случай.
 */

/** Шаг между соседними рангами при перенумерации и при вставке в начало или конец колонки */
export const RANK_STEP = 1;

/** Минимальный зазор, ниже которого считаем, что места между соседями не осталось */
const MIN_GAP = 1e-9;

/**
 * Ранг для карточки между `before` (выше) и `after` (ниже).
 * undefined — соседа нет (начало или конец колонки). null — места нет, нужна перенумерация.
 */
export function rankBetween(before: number | undefined, after: number | undefined): number | null {
  if (before === undefined && after === undefined) return 0;
  if (before === undefined) return (after ?? 0) - RANK_STEP;
  if (after === undefined) return before + RANK_STEP;
  if (after - before < MIN_GAP) return null;
  return (before + after) / 2;
}

/** Новые ранги для колонки в текущем порядке: 0, 1, 2… */
export function evenRanks(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index * RANK_STEP);
}
