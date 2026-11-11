/**
 * Сборка для Vercel через Build Output API (https://vercel.com/docs/build-output-api/v3).
 *
 * Результат — папка .vercel/output:
 *   static/                  — собранный фронтенд (apps/web/dist)
 *   functions/api.func/      — API, упакованный esbuild в один ESM-файл
 *   config.json              — маршрутизация: /api/* → функция, остальное — статика
 *
 * На Vercel перед сборкой применяются миграции к базе этого окружения
 * (у каждого превью — своя ветка базы в Neon, у продакшена — основная).
 */
import { execSync } from 'node:child_process';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { runMigrations } from '../apps/api/src/db/migrate.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = `${root}.vercel/output`;
const functionDir = `${output}/functions/api.func`;

async function migrate(): Promise<void> {
  if (process.env.VERCEL !== '1') {
    console.log('▸ Миграции пропущены: сборка не на Vercel');
    return;
  }
  // Для миграций нужно прямое подключение, без пулера
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL не задан: подключите базу Neon к проекту Vercel (Storage → Neon)');
  }
  console.log(`▸ Применяю миграции (окружение: ${process.env.VERCEL_ENV ?? 'unknown'})`);
  await runMigrations(url);
}

async function buildWeb(): Promise<void> {
  console.log('▸ Собираю фронтенд');
  execSync('npm run build -w @job-tracker/web', { cwd: root, stdio: 'inherit' });
  await cp(`${root}apps/web/dist`, `${output}/static`, { recursive: true });
}

async function buildApi(): Promise<void> {
  console.log('▸ Собираю функцию API');
  await build({
    entryPoints: [`${root}apps/api/src/vercel.ts`],
    outfile: `${functionDir}/index.mjs`,
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    // Часть зависимостей — CommonJS: даём им require внутри ESM-бандла
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
    logLevel: 'warning',
  });

  await writeFile(
    `${functionDir}/.vc-config.json`,
    JSON.stringify(
      {
        runtime: 'nodejs22.x',
        handler: 'index.mjs',
        launcherType: 'Nodejs',
        shouldAddHelpers: false,
        supportsResponseStreaming: true,
      },
      null,
      2,
    ),
  );
}

async function writeConfig(): Promise<void> {
  await writeFile(
    `${output}/config.json`,
    JSON.stringify(
      {
        version: 3,
        routes: [
          // Функция получает исходный путь (/api/health), Hono маршрутизирует сам
          { src: '^/api(?:/.*)?$', dest: '/api' },
          { handle: 'filesystem' },
        ],
      },
      null,
      2,
    ),
  );
}

await rm(output, { recursive: true, force: true });
await mkdir(functionDir, { recursive: true });
await migrate();
await buildWeb();
await buildApi();
await writeConfig();
console.log(`✓ Готово: ${output}`);
