import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { AuthService } from './auth';
import type { Db } from './db/client';
import { createVacancyRepository } from './vacancies/repository';
import { createVacancyRoutes } from './vacancies/routes';

export interface AppDeps {
  db: Db;
  auth: AuthService;
}

/** Переменные контекста запроса после проверки сессии */
export interface AuthedEnv {
  Variables: { userId: string };
}

/**
 * Приложение API без привязки к рантайму: запускается локально через Node (index.ts),
 * в тестах — через app.request(), на Vercel — как серверная функция (vercel.ts).
 * Зависимости передаются снаружи, поэтому тесты подставляют свою базу и авторизацию.
 */
export function createApp({ db, auth }: AppDeps) {
  /** Пускает дальше только с действующей сессией; id пользователя кладёт в контекст */
  const requireUser = createMiddleware<AuthedEnv>(async (c, next) => {
    const userId = await auth.getUserId(c.req.raw.headers);
    if (userId === null) return c.json({ error: 'unauthorized' }, 401);
    c.set('userId', userId);
    await next();
    return undefined;
  });

  const app = new Hono()
    .basePath('/api')
    .get('/health', async (c) => {
      try {
        await db.execute(sql`select 1`);
        return c.json({ status: 'ok', database: 'ok' });
      } catch (error) {
        console.error('Health check: database unreachable', error);
        return c.json({ status: 'error', database: 'unreachable' }, 503);
      }
    })
    // Вход через Google, callback, выход, текущая сессия — всё обслуживает Better Auth
    .on(['GET', 'POST'], '/auth/*', (c) => auth.handler(c.req.raw))
    .use('/vacancies/*', requireUser)
    .use('/vacancies', requireUser)
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
