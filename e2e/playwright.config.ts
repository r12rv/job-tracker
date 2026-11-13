import { defineConfig, devices } from '@playwright/test';
import { API_ENV, API_PORT, BASE_URL, WEB_PORT } from './env.ts';

const isCI = process.env.CI !== undefined;

export default defineConfig({
  testDir: './tests',
  // Все тесты пишут в одну базу и очищают её перед стартом — поэтому строго по очереди
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: BASE_URL,
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    // Пошаговая запись со снимками и сетевыми запросами — только для упавших тестов
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /mobile\.spec\.ts/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],

  // Playwright сам поднимает API на e2e-базе и собранный фронтенд, а после тестов останавливает их
  webServer: [
    {
      name: 'API',
      command: 'npx tsx ../../e2e/prepare-db.ts && npx tsx src/index.ts',
      cwd: '../apps/api',
      env: API_ENV,
      url: `http://localhost:${API_PORT}/api/health`,
      reuseExistingServer: !isCI,
      timeout: 60_000,
    },
    {
      name: 'Web',
      // Продакшен-сборка, как на Vercel, а не dev-сервер: проверяем то, что увидит пользователь
      command: `npm run build && npx vite preview --port ${WEB_PORT} --strictPort`,
      cwd: '../apps/web',
      env: { API_PROXY_TARGET: `http://localhost:${API_PORT}` },
      url: BASE_URL,
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
  ],
});
