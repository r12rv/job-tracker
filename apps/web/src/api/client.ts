import type { AppType } from '@job-tracker/api/src/app.ts';
import { DetailedError, hc, parseResponse, type ClientResponse } from 'hono/client';
import { ApiError } from './errors';

/**
 * Типизированный клиент API (Hono RPC). Пути, тела запросов и типы ответов
 * выводятся из кода сервера: поменяли маршрут на бэкенде — TypeScript подсветит фронтенд.
 * API на том же домене, поэтому cookie сессии отправляются автоматически.
 */
export const api = hc<AppType>('/').api;

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
