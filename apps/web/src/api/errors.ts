/*
 * Ошибки API отдельно от клиента Hono: их используют глобальные обработчики (query-client),
 * которые грузятся сразу, а сам клиент нужен только трекеру и приходит вместе с ним.
 */

/** Ошибка запроса к API. status 0 — сервер недоступен (нет сети, таймаут) */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(status === 0 ? 'Network error' : `API responded with ${String(status)}`);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

/** Понятное пользователю описание ошибки для уведомления */
export function describeError(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Что-то пошло не так. Попробуйте ещё раз.';
  if (error.status === 0) return 'Нет соединения с сервером. Проверьте интернет.';
  if (error.status === 401) return 'Сессия истекла — войдите снова.';
  if (error.status === 404) return 'Вакансия не найдена — возможно, её уже удалили.';
  if (error.status === 409) return 'Данные изменились на другом устройстве — показываем актуальный порядок.';
  if (error.status === 400) return 'Сервер не принял данные. Проверьте поля формы.';
  return 'Ошибка на сервере. Попробуйте ещё раз чуть позже.';
}
