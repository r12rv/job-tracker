import { defineConfig } from 'drizzle-kit';
import { loadLocalEnv, readEnv } from './src/env.ts';

loadLocalEnv();

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: { url: readEnv().DATABASE_URL },
  strict: true,
  verbose: true,
});
