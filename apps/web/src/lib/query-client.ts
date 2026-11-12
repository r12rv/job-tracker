import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError, isUnauthorized } from '../api/client';
import { authClient } from './auth-client';

/** Сессия истекла на сервере — просим Better Auth перечитать её, и приложение покажет экран входа */
function handleGlobalError(error: unknown) {
  if (isUnauthorized(error)) authClient.$store.notify('$sessionSignal');
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleGlobalError }),
  mutationCache: new MutationCache({ onError: handleGlobalError }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Повторяем только сетевые сбои и ошибки сервера: 4xx от повтора не исправится
      retry: (failureCount, error) =>
        failureCount < 2 && (!(error instanceof ApiError) || error.status === 0 || error.status >= 500),
    },
  },
});
