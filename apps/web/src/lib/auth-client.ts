import { createAuthClient } from 'better-auth/react';

/**
 * Клиент Better Auth. API живёт на том же домене (/api/auth),
 * поэтому адрес сервера не нужен, а cookie сессии ходят автоматически.
 */
export const authClient = createAuthClient({ basePath: '/api/auth' });

export function signInWithGoogle(): Promise<unknown> {
  return authClient.signIn.social({ provider: 'google', callbackURL: window.location.href });
}
