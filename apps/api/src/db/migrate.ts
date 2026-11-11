import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { loadLocalEnv } from '../env';
import { createDb } from './client';

export const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url));

/** Применяет миграции из apps/api/drizzle к базе по указанному адресу */
export async function runMigrations(databaseUrl: string): Promise<void> {
  const { db, close } = createDb(databaseUrl);
  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await close();
  }
}

// Запуск как скрипта: npm run db:migrate [-- --test]
if (import.meta.url === `file://${process.argv[1] ?? ''}`) {
  loadLocalEnv();
  const useTestDb = process.argv.includes('--test');
  const url = useTestDb ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;
  if (!url) {
    console.error(useTestDb ? 'TEST_DATABASE_URL не задан' : 'DATABASE_URL не задан');
    process.exit(1);
  }
  await runMigrations(url);
  console.log(`Миграции применены (${useTestDb ? 'тестовая база' : 'основная база'})`);
}
