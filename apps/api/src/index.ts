import { serve } from '@hono/node-server';
import { createApp } from './app';
import { createDb } from './db/client';
import { loadLocalEnv, readEnv } from './env';

loadLocalEnv();
const env = readEnv();
const { db, close } = createDb(env.DATABASE_URL);
const app = createApp({ db });

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`API: http://localhost:${info.port}/api/health`);
});

// Аккуратно закрываем соединения с базой при остановке (Ctrl+C, перезапуск tsx watch)
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close();
    void close().finally(() => process.exit(0));
  });
}
