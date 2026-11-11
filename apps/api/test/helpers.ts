import { vacancySchema, type Vacancy, type VacancyInput } from '@job-tracker/shared';
import { sql } from 'drizzle-orm';
import { createApp } from '../src/app';
import { createDb } from '../src/db/client';

export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error('TEST_DATABASE_URL не задан. Локально: docker compose up -d и apps/api/.env по образцу .env.example');
  }
  // Защита от случайного запуска тестов на рабочей базе: тесты очищают таблицы
  if (!new URL(url).pathname.endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL должен указывать на базу с суффиксом _test');
  }
  return url;
}

export function createTestContext() {
  const { db, close } = createDb(testDatabaseUrl());
  const app = createApp({ db });

  async function request(method: string, path: string, body?: unknown) {
    const init: RequestInit = { method };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
      init.headers = { 'Content-Type': 'application/json' };
    }
    const response = await app.request(path, init);
    const text = await response.text();
    const json: unknown = text === '' ? null : JSON.parse(text);
    return { status: response.status, json };
  }

  return {
    db,
    request,
    close,
    reset: () => db.execute(sql`TRUNCATE vacancies, vacancy_status_changes RESTART IDENTITY CASCADE`),
  };
}

/** Проверяет, что ответ API соответствует общему контракту, и возвращает его типизированным */
export function asVacancy(value: unknown): Vacancy {
  return vacancySchema.parse(value);
}

export function vacancyInput(overrides: Partial<VacancyInput> = {}): VacancyInput {
  return {
    company: 'Яндекс',
    position: 'Frontend-разработчик',
    url: 'https://hh.ru/vacancy/1',
    salary: { min: 300000, max: 400000, currency: 'RUB' },
    appliedAt: '2026-11-02',
    notes: 'Рекрутер Анна',
    status: 'applied',
    ...overrides,
  };
}
