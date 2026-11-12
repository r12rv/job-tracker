import type { AppType } from '@job-tracker/api/src/app.ts';
import { DetailedError, hc, parseResponse, type ClientResponse } from 'hono/client';

/**
 * Типизированный клиент API (Hono RPC). Пути, тела запросов и типы ответов
 * выводятся из кода сервера: поменяли маршрут на бэкенде — TypeScript подсветит фронтенд.
 * API на том же домене, поэтому cookie сессии отправляются автоматически.
 */
export const api = hc<AppType>('/').api;

/** Ошибка запроса к API. status 0 — сервер недоступен (нет сети, таймаут) */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(status === 0 ? 'Network error' : `API responded with ${String(status)}`);
    this.name = 'ApiError';
    this.status = status;
  }
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof DetailedError) {
    const status: unknown = error.statusCode;
    return new ApiError(typeof status === 'number' ? status : 500);
  }
  // fetch бросает TypeError, если запрос вообще не дошёл до сервера
  return new ApiError(0);
}

/** Выполняет запрос: возвращает тело успешного ответа, иначе бросает ApiError */
export async function call<T extends ClientResponse<unknown>>(request: Promise<T>) {
  try {
    return await parseResponse(request);
  } catch (error) {
    throw toApiError(error);
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
  if (error.status === 400) return 'Сервер не принял данные. Проверьте поля формы.';
  return 'Ошибка на сервере. Попробуйте ещё раз чуть позже.';
}
