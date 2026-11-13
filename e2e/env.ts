/**
 * Окружение e2e-тестов. Своя база и свои порты, поэтому тесты не трогают данные
 * из `npm run dev` и могут идти одновременно с запущенным dev-сервером.
 */
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgres://job_tracker:job_tracker@localhost:5433/job_tracker_e2e';

export const API_PORT = 3180;
export const WEB_PORT = 5180;
export const BASE_URL = `http://localhost:${WEB_PORT}`;

/** Секрет подписи сессий: общий у API e2e и у тестов, которые создают сессии напрямую */
export const AUTH_SECRET = 'e2e-secret-that-is-at-least-32-characters-long';

/** Переменные для API в e2e: настоящий Google не нужен — вход идёт через готовую сессию */
export const API_ENV = {
  DATABASE_URL: E2E_DATABASE_URL,
  PORT: String(API_PORT),
  BETTER_AUTH_URL: BASE_URL,
  BETTER_AUTH_SECRET: AUTH_SECRET,
  GOOGLE_CLIENT_ID: 'e2e-google-client-id',
  GOOGLE_CLIENT_SECRET: 'e2e-google-client-secret',
};

/** Защита от запуска на рабочей базе: тесты очищают таблицы */
export function assertE2eDatabase(url: string): void {
  if (!new URL(url).pathname.endsWith('_e2e')) {
    throw new Error('E2E_DATABASE_URL должен указывать на базу с суффиксом _e2e');
  }
}
