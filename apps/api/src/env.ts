import { z } from 'zod';

/**
 * Подхватывает .env из текущей папки (скрипты пакета запускаются из apps/api), если он есть.
 * В CI и на Vercel переменные приходят из окружения, файла там нет.
 */
export function loadLocalEnv(path = '.env'): void {
  try {
    process.loadEnvFile(path);
  } catch {
    // файла нет — это нормально
  }
}

const envSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/, error: 'DATABASE_URL должен быть строкой подключения postgres://' }),
  PORT: z.coerce.number().int().positive().default(3001),
});

export type Env = z.infer<typeof envSchema>;

export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Некорректные переменные окружения:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
