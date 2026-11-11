import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export function createDb(databaseUrl: string) {
  const client = postgres(databaseUrl, {
    // В серверных функциях соединений должно быть мало; prepare: false нужен для пулеров (Neon, PgBouncer)
    max: 5,
    prepare: false,
    onnotice: () => undefined,
  });
  const db = drizzle(client, { schema, casing: 'snake_case' });
  return { db, close: () => client.end() };
}

export type Db = ReturnType<typeof createDb>['db'];
