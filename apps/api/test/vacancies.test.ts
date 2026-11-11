import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { vacancies } from '../src/db/schema';
import { asVacancy, createTestContext, vacancyInput } from './helpers';

const ctx = createTestContext();

beforeEach(async () => {
  await ctx.reset();
});

afterAll(async () => {
  await ctx.close();
});

async function createVacancy(overrides: Parameters<typeof vacancyInput>[0] = {}) {
  const { status, json } = await ctx.request('POST', '/api/vacancies', vacancyInput(overrides));
  expect(status).toBe(201);
  return asVacancy(json);
}

describe('GET /api/health', () => {
  it('отвечает ok', async () => {
    const { status, json } = await ctx.request('GET', '/api/health');
    expect(status).toBe(200);
    expect(json).toEqual({ status: 'ok' });
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
    const { json } = await ctx.request('POST', '/api/vacancies', {
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
    const { status, json } = await ctx.request('POST', '/api/vacancies', {
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
    const { status } = await ctx.request('POST', '/api/vacancies', { ...vacancyInput(), status: 'hired' });
    expect(status).toBe(400);
  });
});

describe('GET /api/vacancies', () => {
  it('возвращает вакансии от новых откликов к старым', async () => {
    await createVacancy({ company: 'Старая', appliedAt: '2026-10-01' });
    await createVacancy({ company: 'Новая', appliedAt: '2026-11-10' });

    const { status, json } = await ctx.request('GET', '/api/vacancies');
    expect(status).toBe(200);
    expect(Array.isArray(json)).toBe(true);
    const list = (json as unknown[]).map(asVacancy);
    expect(list.map((v) => v.company)).toEqual(['Новая', 'Старая']);
  });
});

describe('GET /api/vacancies/:id', () => {
  it('возвращает вакансию по id', async () => {
    const created = await createVacancy();
    const { status, json } = await ctx.request('GET', `/api/vacancies/${created.id}`);
    expect(status).toBe(200);
    expect(asVacancy(json)).toEqual(created);
  });

  it('404 для несуществующей вакансии', async () => {
    const { status, json } = await ctx.request('GET', `/api/vacancies/${randomUUID()}`);
    expect(status).toBe(404);
    expect(json).toEqual({ error: 'not_found' });
  });

  it('400 для некорректного id', async () => {
    const { status } = await ctx.request('GET', '/api/vacancies/123');
    expect(status).toBe(400);
  });
});

describe('PUT /api/vacancies/:id', () => {
  it('обновляет поля и дописывает историю при смене статуса', async () => {
    const created = await createVacancy();
    const { status, json } = await ctx.request(
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
    const { json } = await ctx.request('PUT', `/api/vacancies/${created.id}`, vacancyInput({ position: 'Lead' }));
    expect(asVacancy(json).statusHistory).toHaveLength(1);
  });

  it('404 для несуществующей вакансии', async () => {
    const { status } = await ctx.request('PUT', `/api/vacancies/${randomUUID()}`, vacancyInput());
    expect(status).toBe(404);
  });
});

describe('PATCH /api/vacancies/:id/status', () => {
  it('меняет статус и сохраняет историю переходов', async () => {
    const created = await createVacancy();
    await ctx.request('PATCH', `/api/vacancies/${created.id}/status`, { status: 'interview' });
    const { status, json } = await ctx.request('PATCH', `/api/vacancies/${created.id}/status`, {
      status: 'rejected',
    });

    expect(status).toBe(200);
    const vacancy = asVacancy(json);
    expect(vacancy.status).toBe('rejected');
    expect(vacancy.statusHistory.map((change) => change.status)).toEqual(['applied', 'interview', 'rejected']);
  });

  it('повторная установка того же статуса не создаёт запись в истории', async () => {
    const created = await createVacancy();
    const { json } = await ctx.request('PATCH', `/api/vacancies/${created.id}/status`, { status: 'applied' });
    expect(asVacancy(json).statusHistory).toHaveLength(1);
  });

  it('400 для неизвестного статуса', async () => {
    const created = await createVacancy();
    const { status } = await ctx.request('PATCH', `/api/vacancies/${created.id}/status`, { status: 'hired' });
    expect(status).toBe(400);
  });
});

describe('DELETE /api/vacancies/:id', () => {
  it('удаляет вакансию вместе с историей', async () => {
    const created = await createVacancy();
    const deleted = await ctx.request('DELETE', `/api/vacancies/${created.id}`);
    expect(deleted.status).toBe(204);

    const again = await ctx.request('DELETE', `/api/vacancies/${created.id}`);
    expect(again.status).toBe(404);

    const history = await ctx.db.query.vacancyStatusChanges.findMany();
    expect(history).toHaveLength(0);
  });
});

describe('ограничения базы данных', () => {
  it('не даёт записать вилку min > max даже в обход API', async () => {
    await expect(
      ctx.db.insert(vacancies).values({
        company: 'Обход',
        position: 'API',
        appliedAt: '2026-11-11',
        status: 'applied',
        salaryMin: 500,
        salaryMax: 100,
      }),
    ).rejects.toThrow();
  });
});
