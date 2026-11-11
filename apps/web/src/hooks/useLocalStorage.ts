import { useCallback, useEffect, useEffectEvent, useState } from 'react';

type SetValue<T> = (value: T | ((prev: T) => T)) => void;

/**
 * Состояние, синхронизированное с localStorage.
 * `parse` получает неизвестные данные из хранилища и обязан вернуть валидный T —
 * так повреждённые или устаревшие данные не ломают приложение.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  parse: (raw: unknown) => T,
): [T, SetValue<T>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored === null) return initialValue;
      const parsed: unknown = JSON.parse(stored);
      return parse(parsed);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Хранилище недоступно (приватный режим, переполнение) — работаем в памяти
    }
  }, [key, value]);

  // Всегда видит актуальный `parse`, но не перезапускает подписку при его смене
  const applyExternalValue = useEffectEvent((raw: string) => {
    try {
      const parsed: unknown = JSON.parse(raw);
      setValue(parse(parsed));
    } catch {
      // игнорируем некорректные данные
    }
  });

  // Синхронизация между вкладками браузера
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== key || event.newValue === null) return;
      applyExternalValue(event.newValue);
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [key]);

  const update = useCallback<SetValue<T>>((next) => {
    setValue((prev) => (next instanceof Function ? next(prev) : next));
  }, []);

  return [value, update];
}
