import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import type { AuthService } from '../src/auth';
import { createDb } from '../src/db/client';
import { user, vacancies } from '../src/db/schema';
import { asVacancy, createTestContext, vacancyInput } from './helpers';

const ctx = createTestContext();

/** cookie сессии пользователя, от имени которого идут запросы в тесте */
let cookie: string;

beforeEach(async () => {
  await ctx.reset();
  ({ cookie } = await ctx.signIn());
});

afterAll(async () => {
  await ctx.close();
});

const api = (method: string, path: string, body?: unknown) => ctx.request(method, path, { body, cookie });

async function createVacancy(overrides: Parameters<typeof vacancyInput>[0] = {}, as = cookie) {
  const { status, json } = await ctx.request('POST', '/api/vacancies', { body: vacancyInput(overrides), cookie: as });
  expect(status).toBe(201);
  return asVacancy(json);
}

describe('GET /api/health', () => {
  it('отвечает ok и проверяет связь с базой (без входа)', async () => {
    const { status, json } = await ctx.request('GET', '/api/health');
    expect(status).toBe(200);
    expect(json).toEqual({ status: 'ok', database: 'ok' });
  });

  it('503, если база недоступна', async () => {
    const { db, close } = createDb('postgres://nobody:nobody@127.0.0.1:1/none');
    const noAuth: AuthService = { handler: () => Promise.resolve(new Response(null)), getUserId: () => Promise.resolve(null) };
    try {
      const response = await createApp({ db, auth: noAuth }).request('/api/health');
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ status: 'error', database: 'unreachable' });
    } finally {
      await close();
    }
  });
});

describe('авторизация', () => {
  it('без входа все маршруты вакансий отвечают 401', async () => {
    const id = randomUUID();
    for (const [method, path] of [
      ['GET', '/api/vacancies'],
      ['POST', '/api/vacancies'],
      ['GET', `/api/vacancies/${id}`],
      ['PUT', `/api/vacancies/${id}`],
      ['PATCH', `/api/vacancies/${id}/status`],
      ['DELETE', `/api/vacancies/${id}`],
    ] as const) {
      const body = method === 'GET' || method === 'DELETE' ? undefined : vacancyInput();
      const { status, json } = await ctx.request(method, path, { body });
      expect(status, `${method} ${path}`).toBe(401);
      expect(json).toEqual({ error: 'unauthorized' });
    }
  });

  it('поддельная cookie сессии не проходит', async () => {
    const { status } = await ctx.request('GET', '/api/vacancies', {
      cookie: 'better-auth.session_token=forged.signature',
    });
    expect(status).toBe(401);
  });

  it('GET /api/auth/get-session отдаёт текущего пользователя', async () => {
    const signedIn = await ctx.signIn('Анна');
    const anonymous = await ctx.request('GET', '/api/auth/get-session');
    expect(anonymous.status).toBe(200);
    expect(anonymous.json).toBeNull();

    const { status, json } = await ctx.request('GET', '/api/auth/get-session', { cookie: signedIn.cookie });
    expect(status).toBe(200);
    expect(json).toMatchObject({ user: { id: signedIn.user.id, name: 'Анна' } });
  });
});

describe('изоляция данных между пользователями', () => {
  it('пользователь видит только свои вакансии', async () => {
    const other = await ctx.signIn('Другой');
    await createVacancy({ company: 'Моя' });
    await createVacancy({ company: 'Чужая' }, other.cookie);

    const mine = await api('GET', '/api/vacancies');
    expect((mine.json as unknown[]).map(asVacancy).map((v) => v.company)).toEqual(['Моя']);

    const theirs = await ctx.request('GET', '/api/vacancies', { cookie: other.cookie });
    expect((theirs.json as unknown[]).map(asVacancy).map((v) => v.company)).toEqual(['Чужая']);
  });

  it('чужую вакансию нельзя прочитать, изменить или удалить — 404, как будто её нет', async () => {
    const other = await ctx.signIn('Другой');
    const foreign = await createVacancy({ company: 'Чужая' }, other.cookie);

    expect((await api('GET', `/api/vacancies/${foreign.id}`)).status).toBe(404);
    expect((await api('PUT', `/api/vacancies/${foreign.id}`, vacancyInput({ company: 'Взлом' }))).status).toBe(404);
    expect((await api('PATCH', `/api/vacancies/${foreign.id}/status`, { status: 'offer' })).status).toBe(404);
    expect((await api('DELETE', `/api/vacancies/${foreign.id}`)).status).toBe(404);

    // У владельца всё осталось как было
    const { json } = await ctx.request('GET', `/api/vacancies/${foreign.id}`, { cookie: other.cookie });
    expect(asVacancy(json)).toMatchObject({ company: 'Чужая', status: 'applied' });
  });

  it('при удалении пользователя удаляются и его вакансии', async () => {
    const other = await ctx.signIn('Уходящий');
    await createVacancy({}, other.cookie);
    await ctx.db.delete(user).where(eq(user.id, other.user.id));

    const left = await ctx.db.select().from(vacancies).where(eq(vacancies.userId, other.user.id));
    expect(left).toHaveLength(0);
  });
});

describe('POST /api/vacancies', () => {
  it('создаёт вакансию и первую запись истории статусов', async () => {
    const vacancy = await createVacancy({ company: '  Сбер  ', status: 'test' });

    expect(vacancy).toMatchObject({
      company: 'Сбер',
      position: 'Frontend-разработчик',
      url: 'https://hh.ru/vacancy/1',
      salary: { min: 300000, max: 400000, currency: 'RUB' },
      appliedAt: '2026-11-02',
      status: 'test',
    });
    expect(vacancy.statusHistory).toHaveLength(1);
    expect(vacancy.statusHistory[0]?.status).toBe('test');
  });

  it('не возвращает пустые необязательные поля', async () => {
    const { json } = await api('POST', '/api/vacancies', {
      company: 'Avito',
      position: 'React',
      salary: { currency: 'EUR' },
      appliedAt: '2026-11-08',
      status: 'applied',
    });
    const vacancy = asVacancy(json);
    expect(vacancy).not.toHaveProperty('url');
    expect(vacancy).not.toHaveProperty('notes');
    expect(vacancy.salary).toEqual({ currency: 'EUR' });
  });

  it('возвращает 400 с ошибками по полям из общей схемы', async () => {
    const { status, json } = await api('POST', '/api/vacancies', {
      ...vacancyInput(),
      company: '   ',
      url: 'not a url',
      salary: { min: 500000, max: 100000, currency: 'RUB' },
    });

    expect(status).toBe(400);
    expect(json).toMatchObject({
      error: 'validation_error',
      issues: expect.arrayContaining([
        { path: 'company', message: 'Укажите компанию' },
        { path: 'url', message: 'Некорректная ссылка' },
        { path: 'salary.max', message: 'Максимум меньше минимума' },
      ]) as unknown,
    });
  });

  it('отклоняет неизвестный статус', async () => {
    const { status } = await api('POST', '/api/vacancies', { ...vacancyInput(), status: 'hired' });
    expect(status).toBe(400);
  });
});

describe('GET /api/vacancies', () => {
  it('возвращает вакансии от новых откликов к старым', async () => {
    await createVacancy({ company: 'Старая', appliedAt: '2026-10-01' });
    await createVacancy({ company: 'Новая', appliedAt: '2026-11-10' });

    const { status, json } = await api('GET', '/api/vacancies');
    expect(status).toBe(200);
    expect(Array.isArray(json)).toBe(true);
    const list = (json as unknown[]).map(asVacancy);
    expect(list.map((v) => v.company)).toEqual(['Новая', 'Старая']);
  });
});

describe('GET /api/vacancies/:id', () => {
  it('возвращает вакансию по id', async () => {
    const created = await createVacancy();
    const { status, json } = await api('GET', `/api/vacancies/${created.id}`);
    expect(status).toBe(200);
    expect(asVacancy(json)).toEqual(created);
  });

  it('404 для несуществующей вакансии', async () => {
    const { status, json } = await api('GET', `/api/vacancies/${randomUUID()}`);
    expect(status).toBe(404);
    expect(json).toEqual({ error: 'not_found' });
  });

  it('400 для некорректного id', async () => {
    const { status } = await api('GET', '/api/vacancies/123');
    expect(status).toBe(400);
  });
});

describe('PUT /api/vacancies/:id', () => {
  it('обновляет поля и дописывает историю при смене статуса', async () => {
    const created = await createVacancy();
    const { status, json } = await api(
      'PUT',
      `/api/vacancies/${created.id}`,
      vacancyInput({ position: 'Senior Frontend', status: 'interview', notes: undefined }),
    );

    expect(status).toBe(200);
    const updated = asVacancy(json);
    expect(updated.position).toBe('Senior Frontend');
    expect(updated).not.toHaveProperty('notes');
    expect(updated.statusHistory.map((change) => change.status)).toEqual(['applied', 'interview']);
    expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(Date.parse(created.updatedAt));
  });

  it('не дописывает историю, если статус не изменился', async () => {
    const created = await createVacancy();
    const { json } = await api('PUT', `/api/vacancies/${created.id}`, vacancyInput({ position: 'Lead' }));
    expect(asVacancy(json).statusHistory).toHaveLength(1);
  });

  it('404 для несуществующей вакансии', async () => {
    const { status } = await api('PUT', `/api/vacancies/${randomUUID()}`, vacancyInput());
    expect(status).toBe(404);
  });
});

describe('PATCH /api/vacancies/:id/status', () => {
  it('меняет статус и сохраняет историю переходов', async () => {
    const created = await createVacancy();
    await api('PATCH', `/api/vacancies/${created.id}/status`, { status: 'interview' });
    const { status, json } = await api('PATCH', `/api/vacancies/${created.id}/status`, { status: 'rejected' });

    expect(status).toBe(200);
    const vacancy = asVacancy(json);
    expect(vacancy.status).toBe('rejected');
    expect(vacancy.statusHistory.map((change) => change.status)).toEqual(['applied', 'interview', 'rejected']);
  });

  it('повторная установка того же статуса не создаёт запись в истории', async () => {
    const created = await createVacancy();
    const { json } = await api('PATCH', `/api/vacancies/${created.id}/status`, { status: 'applied' });
    expect(asVacancy(json).statusHistory).toHaveLength(1);
  });

  it('400 для неизвестного статуса', async () => {
    const created = await createVacancy();
    const { status } = await api('PATCH', `/api/vacancies/${created.id}/status`, { status: 'hired' });
    expect(status).toBe(400);
  });
});

describe('DELETE /api/vacancies/:id', () => {
  it('удаляет вакансию вместе с историей', async () => {
    const created = await createVacancy();
    const deleted = await api('DELETE', `/api/vacancies/${created.id}`);
    expect(deleted.status).toBe(204);

    const again = await api('DELETE', `/api/vacancies/${created.id}`);
    expect(again.status).toBe(404);

    const history = await ctx.db.query.vacancyStatusChanges.findMany();
    expect(history).toHaveLength(0);
  });
});

describe('ограничения базы данных', () => {
  it('не даёт записать вилку min > max даже в обход API', async () => {
    const owner = await ctx.signIn('Обход');
    await expect(
      ctx.db.insert(vacancies).values({
        userId: owner.user.id,
        company: 'Обход',
        position: 'API',
        appliedAt: '2026-11-11',
        status: 'applied',
        salaryMin: 500,
        salaryMax: 100,
      }),
    ).rejects.toThrow();
  });

  it('вакансия не может существовать без владельца', async () => {
    await expect(
      ctx.db.insert(vacancies).values({
        userId: 'no-such-user',
        company: 'Сирота',
        position: 'API',
        appliedAt: '2026-11-11',
        status: 'applied',
      }),
    ).rejects.toThrow();
  });
});
