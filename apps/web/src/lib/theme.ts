import { useCallback, useEffect, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

/** Ключ и правило выбора темы совпадают со скриптом в index.html, который применяет тему до отрисовки */
const STORAGE_KEY = 'job-tracker:theme';
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

/** Явный выбор пользователя; null — следуем настройке системы */
function readStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    return null;
  }
}

function currentTheme(): Theme {
  return readStoredTheme() ?? (darkQuery.matches ? 'dark' : 'light');
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#020617' : '#f8fafc');
}

const listeners = new Set<() => void>();
const notify = () => {
  listeners.forEach((listener) => {
    listener();
  });
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Тема меняется и снаружи: в настройках системы и в соседней вкладке
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  darkQuery.addEventListener('change', listener);
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    darkQuery.removeEventListener('change', listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Текущая тема и переключатель. Пока пользователь не выбрал тему сам, она следует за системой */
export function useTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore(subscribe, currentTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = useCallback(() => {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Хранилище недоступно — тема переключится только до перезагрузки
      applyTheme(next);
    }
    notify();
  }, []);

  return [theme, toggle];
}
