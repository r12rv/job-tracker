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

const optionalString = z
  .string()
  .optional()
  .transform((value) => (value === '' ? undefined : value));

const envSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/, error: 'DATABASE_URL должен быть строкой подключения postgres://' }),
  PORT: z.coerce.number().int().positive().default(3001),

  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET: нужна случайная строка от 32 символов (openssl rand -base64 32)'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID не задан'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET не задан'),
  /** Адрес сайта для локальной разработки; на Vercel вычисляется из системных переменных */
  BETTER_AUTH_URL: optionalString,

  // Системные переменные Vercel: https://vercel.com/docs/environment-variables/system-environment-variables
  VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
  VERCEL_URL: optionalString,
  VERCEL_BRANCH_URL: optionalString,
  VERCEL_PROJECT_PRODUCTION_URL: optionalString,
});

export type Env = z.infer<typeof envSchema>;

export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Некорректные переменные окружения:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
