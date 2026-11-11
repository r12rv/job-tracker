import { runMigrations } from '../src/db/migrate';
import { testDatabaseUrl } from './helpers';

export async function setup(): Promise<void> {
  await runMigrations(testDatabaseUrl());
}
