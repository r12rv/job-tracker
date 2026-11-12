import { defineConfig } from 'drizzle-kit';
import { loadLocalEnv } from './src/env.ts';

loadLocalEnv();

// drizzle-kit нужна только база — остальные переменные (Google, секреты) ему не требуются
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL не задан (apps/api/.env или окружение)');

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
