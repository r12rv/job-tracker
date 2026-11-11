import { Hono } from 'hono';

/**
 * Приложение API без привязки к рантайму: запускается локально через Node (index.ts),
 * а позже — как серверная функция Vercel на том же домене, что и фронтенд.
 */
export const app = new Hono().basePath('/api');

app.get('/health', (c) => c.json({ status: 'ok' }));

export type AppType = typeof app;
