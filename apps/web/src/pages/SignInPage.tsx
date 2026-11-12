import { useState } from 'react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { GoogleIcon } from '../components/ui/Icons';
import { signInWithGoogle } from '../lib/auth-client';

/** Экран для гостя: все функции доступны только после входа. В следующем PR станет полноценной стартовой страницей */
export function SignInPage() {
  const [busy, setBusy] = useState(false);

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="flex max-w-md flex-col items-center text-center">
          <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Все отклики в одном месте</h2>
          <p className="mt-3 text-slate-600">
            Канбан и таблица откликов, статусы от отклика до оффера и статистика приглашений на собеседования.
            Войдите, чтобы начать, — данные сохранятся в аккаунте и будут доступны с любого устройства.
          </p>
          <Button
            className="mt-6"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              signInWithGoogle().catch(() => {
                setBusy(false);
              });
            }}
          >
            <GoogleIcon className="size-4 rounded-full bg-white p-px" />
            Войти через Google
          </Button>
        </div>
      </main>
    </>
  );
}
