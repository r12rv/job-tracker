import { randomUUID } from 'node:crypto';
import { vacancySchema, type Vacancy, type VacancyInput } from '@job-tracker/shared';
import { betterAuth } from 'better-auth';
import { testUtils } from 'better-auth/plugins';
import { sql } from 'drizzle-orm';
import { createApp } from '../src/app';
import { authOptions, type AuthConfig, type AuthService } from '../src/auth';
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

const testAuthConfig: AuthConfig = {
  secret: 'test-secret-that-is-at-least-32-characters-long',
  baseURL: 'http://localhost:3001',
  trustedOrigins: ['http://localhost:3001'],
  google: { clientId: 'test-client-id', clientSecret: 'test-client-secret' },
};

export function createTestContext() {
  const { db, close } = createDb(testDatabaseUrl());

  // Настоящий Better Auth с нашей схемой и базой + testUtils: создаёт пользователей и подписанные сессии без Google
  const options = authOptions(db, testAuthConfig);
  const auth = betterAuth({ ...options, plugins: [...options.plugins, testUtils()] });
  const authService: AuthService = {
    handler: (request) => auth.handler(request),
    getUserId: async (headers) => (await auth.api.getSession({ headers }))?.user.id ?? null,
  };
  const app = createApp({ db, auth: authService });

  /** Создаёт пользователя в базе и возвращает cookie его сессии */
  async function signIn(name = 'Тестовый пользователь') {
    const { test } = await auth.$context;
    const user = await test.saveUser(test.createUser({ name, email: `${randomUUID()}@example.com` }));
    const headers = await test.getAuthHeaders({ userId: user.id });
    return { user, cookie: headers.get('cookie') ?? '' };
  }

  async function request(method: string, path: string, options: { body?: unknown; cookie?: string } = {}) {
    const headers = new Headers();
    if (options.cookie) headers.set('cookie', options.cookie);
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      init.body = JSON.stringify(options.body);
      headers.set('Content-Type', 'application/json');
    }
    const response = await app.request(path, init);
    const text = await response.text();
    const json: unknown = text === '' ? null : JSON.parse(text);
    return { status: response.status, json };
  }

  return {
    db,
    request,
    signIn,
    close,
    reset: () =>
      db.execute(sql`TRUNCATE "user", vacancies, vacancy_status_changes, session, account, verification CASCADE`),
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
