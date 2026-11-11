import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Db } from './db/client';
import { createVacancyRepository } from './vacancies/repository';
import { createVacancyRoutes } from './vacancies/routes';

export interface AppDeps {
  db: Db;
  /**
   * CRUD вакансий. Выключен в облаке, пока нет авторизации:
   * без неё любой со ссылкой мог бы читать и удалять данные.
   */
  enableVacancies: boolean;
}

/**
 * Приложение API без привязки к рантайму: запускается локально через Node (index.ts),
 * в тестах — через app.request(), на Vercel — как серверная функция (vercel.ts).
 * Зависимости передаются снаружи, поэтому тесты подставляют свою базу.
 */
export function createApp({ db, enableVacancies }: AppDeps) {
  const app = new Hono().basePath('/api').get('/health', async (c) => {
    try {
      await db.execute(sql`select 1`);
      return c.json({ status: 'ok', database: 'ok' });
    } catch (error) {
      console.error('Health check: database unreachable', error);
      return c.json({ status: 'error', database: 'unreachable' }, 503);
    }
  });

  const withVacancies = enableVacancies
    ? app.route('/vacancies', createVacancyRoutes(createVacancyRepository(db)))
    : app;

  withVacancies.notFound((c) => c.json({ error: 'not_found' }, 404));

  withVacancies.onError((error, c) => {
    if (error instanceof HTTPException) return error.getResponse();
    console.error(error);
    return c.json({ error: 'internal_error' }, 500);
  });

  return withVacancies;
}

/** Тип API для типизированного клиента на фронтенде (hono/client) — с включёнными маршрутами вакансий */
export type AppType = ReturnType<typeof createApp>;
