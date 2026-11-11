import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Db } from './db/client';
import { createVacancyRepository } from './vacancies/repository';
import { createVacancyRoutes } from './vacancies/routes';

export interface AppDeps {
  db: Db;
}

/**
 * Приложение API без привязки к рантайму: запускается локально через Node (index.ts),
 * в тестах — через app.request(), позже — как серверная функция Vercel.
 * Зависимости передаются снаружи, поэтому тесты подставляют свою базу.
 */
export function createApp({ db }: AppDeps) {
  const app = new Hono()
    .basePath('/api')
    .get('/health', (c) => c.json({ status: 'ok' }))
    .route('/vacancies', createVacancyRoutes(createVacancyRepository(db)));

  app.notFound((c) => c.json({ error: 'not_found' }, 404));

  app.onError((error, c) => {
    if (error instanceof HTTPException) return error.getResponse();
    console.error(error);
    return c.json({ error: 'internal_error' }, 500);
  });

  return app;
}

/** Тип API для типизированного клиента на фронтенде (hono/client) */
export type AppType = ReturnType<typeof createApp>;
