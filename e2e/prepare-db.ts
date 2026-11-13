import postgres from 'postgres';
import { runMigrations } from '../apps/api/src/db/migrate.ts';
import { assertE2eDatabase, E2E_DATABASE_URL } from './env.ts';

/** Создаёт базу для e2e, если её ещё нет (локально Docker-том мог появиться раньше этой базы) */
async function ensureDatabase(url: string): Promise<void> {
  const target = new URL(url);
  const name = target.pathname.slice(1);
  const admin = new URL(url);
  admin.pathname = '/postgres';

  const sql = postgres(admin.toString(), { max: 1, onnotice: () => undefined });
  try {
    const existing = await sql`select 1 from pg_database where datname = ${name}`;
    if (existing.length === 0) await sql.unsafe(`create database "${name}"`);
  } finally {
    await sql.end();
  }
}

// Запускается перед стартом API в e2e (см. webServer в playwright.config.ts):
// API считается готовым, только когда отвечает /api/health, а тому нужна база
assertE2eDatabase(E2E_DATABASE_URL);
await ensureDatabase(E2E_DATABASE_URL);
await runMigrations(E2E_DATABASE_URL);
console.log('e2e: база готова');
