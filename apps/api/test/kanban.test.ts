import { evenRanks, rankBetween, type VacancyStatus } from '@job-tracker/shared';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { vacancies } from '../src/db/schema';
import { asVacancy, createTestContext, vacancyInput } from './helpers';

const ctx = createTestContext();
let cookie: string;

beforeEach(async () => {
  await ctx.reset();
  ({ cookie } = await ctx.signIn());
});

afterAll(async () => {
  await ctx.close();
});

const api = (method: string, path: string, body?: unknown, as = cookie) =>
  ctx.request(method, path, { body, cookie: as });

async function create(company: string, status: VacancyStatus = 'applied', as = cookie) {
  const { status: code, json } = await api('POST', '/api/vacancies', vacancyInput({ company, status }), as);
  expect(code).toBe(201);
  return asVacancy(json);
}

/** Компании колонки в том порядке, в каком их покажет канбан */
async function column(status: VacancyStatus): Promise<string[]> {
  const { json } = await api('GET', '/api/vacancies');
  return (json as unknown[])
    .map(asVacancy)
    .filter((vacancy) => vacancy.status === status)
    .sort((a, b) => a.rank - b.rank || b.createdAt.localeCompare(a.createdAt))
    .map((vacancy) => vacancy.company);
}

const move = (id: string, status: VacancyStatus, afterId: string | null, as = cookie) =>
  api('PATCH', `/api/vacancies/${id}/move`, { status, afterId }, as);

describe('rankBetween', () => {
  it('ставит в начало, в конец и посередине', () => {
    expect(rankBetween(undefined, undefined)).toBe(0);
    expect(rankBetween(undefined, 0)).toBe(-1);
    expect(rankBetween(3, undefined)).toBe(4);
    expect(rankBetween(1, 2)).toBe(1.5);
  });

  it('сообщает, что места не осталось', () => {
    expect(rankBetween(1, 1)).toBeNull();
    expect(rankBetween(1, 1 + 1e-12)).toBeNull();
    expect(evenRanks(3)).toEqual([0, 1, 2]);
  });
});

describe('порядок в канбане', () => {
  it('новая вакансия встаёт наверх своей колонки', async () => {
    await create('А');
    await create('Б');
    await create('В');
    expect(await column('applied')).toEqual(['В', 'Б', 'А']);
  });

  it('перестановка внутри колонки не трогает историю статусов', async () => {
    const a = await create('А');
    const b = await create('Б');
    await create('В'); // порядок: В, Б, А

    const { status, json } = await move(a.id, 'applied', null);
    expect(status).toBe(200);
    expect(asVacancy(json).statusHistory).toHaveLength(1);
    expect(await column('applied')).toEqual(['А', 'В', 'Б']);

    await move(a.id, 'applied', b.id);
    expect(await column('applied')).toEqual(['В', 'Б', 'А']);
  });

  it('перенос в другую колонку меняет статус и пишет историю', async () => {
    const a = await create('А');
    const x = await create('Икс', 'interview');
    await create('Игрек', 'interview'); // колонка: Игрек, Икс

    const { status, json } = await move(a.id, 'interview', x.id);
    expect(status).toBe(200);
    const moved = asVacancy(json);
    expect(moved.status).toBe('interview');
    expect(moved.statusHistory.map((change) => change.status)).toEqual(['applied', 'interview']);
    expect(await column('interview')).toEqual(['Игрек', 'Икс', 'А']);
    expect(await column('applied')).toEqual([]);
  });

  it('смена статуса через PATCH /status ставит карточку наверх новой колонки', async () => {
    const a = await create('А');
    await create('Икс', 'offer');
    await api('PATCH', `/api/vacancies/${a.id}/status`, { status: 'offer' });
    expect(await column('offer')).toEqual(['А', 'Икс']);
  });

  it('когда места между соседями нет, колонка перенумеровывается', async () => {
    const a = await create('А');
    await create('Б');
    const c = await create('В');
    // Одинаковые ранги — как после одновременных вставок с разных устройств. Порядок тогда по дате создания
    await ctx.db.update(vacancies).set({ rank: 5 });
    expect(await column('applied')).toEqual(['В', 'Б', 'А']);

    expect((await move(a.id, 'applied', c.id)).status).toBe(200);
    expect(await column('applied')).toEqual(['В', 'А', 'Б']);

    const ranks = (await ctx.db.select({ rank: vacancies.rank }).from(vacancies)).map((row) => row.rank);
    expect(new Set(ranks).size).toBe(3);
  });

  it('409, если соседа уже нет в этой колонке', async () => {
    const a = await create('А');
    const other = await create('Икс', 'offer');
    const { status, json } = await move(a.id, 'applied', other.id);
    expect(status).toBe(409);
    expect(json).toEqual({ error: 'conflict' });
    expect((await move(a.id, 'applied', a.id)).status).toBe(409);
  });

  it('чужие вакансии нельзя двигать и нельзя использовать как соседей', async () => {
    const mine = await create('Моя');
    const { cookie: otherCookie } = await ctx.signIn('Другой');
    const theirs = await create('Чужая', 'applied', otherCookie);

    expect((await move(theirs.id, 'applied', null)).status).toBe(404);
    expect((await move(mine.id, 'applied', theirs.id)).status).toBe(409);
  });

  it('400 на некорректное тело', async () => {
    const a = await create('А');
    expect((await api('PATCH', `/api/vacancies/${a.id}/move`, { status: 'unknown', afterId: null })).status).toBe(400);
    expect((await api('PATCH', `/api/vacancies/${a.id}/move`, { status: 'applied', afterId: 'nope' })).status).toBe(400);
    expect((await api('PATCH', `/api/vacancies/${a.id}/move`, { status: 'applied' })).status).toBe(400);
  });
});
