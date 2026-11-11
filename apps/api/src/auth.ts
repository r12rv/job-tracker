import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { oAuthProxy } from 'better-auth/plugins';
import type { Db } from './db/client';
import { account, session, user, verification } from './db/schema';
import type { Env } from './env';

/**
 * Превью-деплои Vercel: job-tracker-<что угодно>-<команда>.vercel.app.
 * Такие адреса может создать только эта команда Vercel, поэтому шаблону можно доверять:
 * продакшен вернёт на них пользователя после входа через Google (плагин oAuthProxy).
 */
const PREVIEW_ORIGIN_PATTERN = 'https://job-tracker-*-mmmbulochkas-projects.vercel.app';

export interface AuthConfig {
  secret: string;
  /** Адрес, на котором пользователь открыл сайт (Better Auth ставит cookie на этот домен) */
  baseURL: string;
  /** Адрес продакшена: Google возвращает пользователя только туда, превью проксируются через него */
  productionURL?: string;
  trustedOrigins: string[];
  google: { clientId: string; clientSecret: string };
}

const https = (host: string | undefined) => (host ? `https://${host}` : undefined);

/** Конфигурация входа из переменных окружения: локально, на превью и в продакшене */
export function authConfigFromEnv(env: Env): AuthConfig {
  const productionURL = https(env.VERCEL_PROJECT_PRODUCTION_URL);
  const onVercel = env.VERCEL_ENV !== undefined;

  const baseURL =
    env.BETTER_AUTH_URL ??
    (env.VERCEL_ENV === 'production' ? productionURL : undefined) ??
    https(env.VERCEL_BRANCH_URL) ??
    https(env.VERCEL_URL) ??
    'http://localhost:5173';

  const trustedOrigins = [baseURL, productionURL, https(env.VERCEL_BRANCH_URL), https(env.VERCEL_URL)].filter(
    (origin): origin is string => origin !== undefined,
  );
  if (onVercel) trustedOrigins.push(PREVIEW_ORIGIN_PATTERN);

  return {
    secret: env.BETTER_AUTH_SECRET,
    baseURL,
    ...(onVercel && productionURL !== undefined && { productionURL }),
    trustedOrigins: [...new Set(trustedOrigins)],
    google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
  };
}

/** Общие настройки Better Auth — их же используют тесты, добавляя плагин testUtils */
export function authOptions(db: Db, config: AuthConfig) {
  return {
    appName: 'Трекер откликов',
    basePath: '/api/auth',
    baseURL: config.baseURL,
    secret: config.secret,
    trustedOrigins: config.trustedOrigins,
    database: drizzleAdapter(db, { provider: 'pg', schema: { user, session, account, verification } }),
    socialProviders: {
      google: {
        clientId: config.google.clientId,
        clientSecret: config.google.clientSecret,
        prompt: 'select_account',
        // На Vercel Google всегда возвращает на продакшен-адрес (он единственный зарегистрирован в Google Cloud)
        ...(config.productionURL !== undefined && {
          redirectURI: `${config.productionURL}/api/auth/callback/google`,
        }),
      },
    },
    session: {
      // Кэш сессии в подписанной cookie: не ходим в базу на каждый запрос
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    plugins: [oAuthProxy(config.productionURL !== undefined ? { productionURL: config.productionURL } : {})],
  } satisfies BetterAuthOptions;
}

/** То, что нужно приложению от системы авторизации — легко подменить в тестах */
export interface AuthService {
  /** Обработчик маршрутов /api/auth/* (вход, callback от Google, выход, сессия) */
  handler: (request: Request) => Promise<Response>;
  /** id пользователя по cookie сессии или null */
  getUserId: (headers: Headers) => Promise<string | null>;
}

export function createAuth(db: Db, config: AuthConfig): AuthService {
  const auth = betterAuth(authOptions(db, config));
  return {
    handler: (request) => auth.handler(request),
    getUserId: async (headers) => (await auth.api.getSession({ headers }))?.user.id ?? null,
  };
}
