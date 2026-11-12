import { useEffect, useRef, useState } from 'react';
import { authClient, signInWithGoogle } from '../../lib/auth-client';
import { queryClient } from '../../lib/query-client';
import { Button } from '../ui/Button';
import { GoogleIcon } from '../ui/Icons';

interface AvatarProps {
  name: string;
  image?: string | null | undefined;
}

function Avatar({ name, image }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  if (image && !failed) {
    return (
      <img
        src={image}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => {
          setFailed(true);
        }}
        className="size-8 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="flex size-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

/** Кнопка входа через Google или аватар с меню (имя, почта, выход) */
export function UserMenu() {
  const { data, isPending } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Закрытие меню по клику снаружи и по Escape
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (isPending) {
    return <span className="size-8 animate-pulse rounded-full bg-slate-200" aria-label="Загрузка профиля" />;
  }

  if (!data) {
    return (
      <Button
        variant="secondary"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          signInWithGoogle().catch(() => {
            setBusy(false);
          });
        }}
      >
        <GoogleIcon className="size-4" />
        Войти
      </Button>
    );
  }

  const { user } = data;
  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Профиль: ${user.name}`}
        className="flex rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        <Avatar name={user.name} image={user.image} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-64 rounded-xl bg-white p-1 shadow-lg ring-1 ring-slate-200"
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-slate-100" />
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void authClient.signOut().finally(() => {
                // Данные аккаунта не должны оставаться в памяти вкладки после выхода
                queryClient.clear();
                setBusy(false);
                setOpen(false);
              });
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Выйти
          </button>
        </div>
      )}
    </div>
  );
}
