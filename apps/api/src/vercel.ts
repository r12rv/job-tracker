import { createApp } from './app';
import { createDb } from './db/client';
import { readEnv } from './env';

/**
 * Точка входа серверной функции Vercel.
 * Модуль переиспользуется между запросами, пока функция «тёплая», —
 * поэтому подключение к базе создаётся один раз при холодном старте.
 */
const env = readEnv();
const { db } = createDb(env.DATABASE_URL);
const app = createApp({ db, enableVacancies: env.ENABLE_VACANCIES_API });

const handler = (request: Request) => app.fetch(request);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
