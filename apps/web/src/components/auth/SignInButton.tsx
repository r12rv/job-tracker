import { useState } from 'react';
import { signInWithGoogle } from '../../lib/auth-client';
import { Button } from '../ui/Button';
import { GoogleIcon } from '../ui/Icons';

interface SignInButtonProps {
  className?: string;
  label?: string;
}

/** Главная кнопка входа: блокируется на время перехода в Google */
export function SignInButton({ className = '', label = 'Войти через Google' }: SignInButtonProps) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      className={`h-11 px-5 text-base ${className}`}
      disabled={busy}
      onClick={() => {
        setBusy(true);
        signInWithGoogle().catch(() => {
          setBusy(false);
        });
      }}
    >
      <GoogleIcon className="size-5 rounded-full bg-white p-0.5" />
      {busy ? 'Переход в Google…' : label}
    </Button>
  );
}
