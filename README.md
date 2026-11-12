# Трекер откликов на вакансии

[![CI](https://github.com/r12rv/job-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/r12rv/job-tracker/actions/workflows/ci.yml)

**Демо:** https://job-tracker-olive-one.vercel.app

React + TypeScript + Vite + Tailwind CSS. Данные хранятся в `localStorage` браузера.

## Процесс разработки

- Изменения попадают в `main` только через pull request; прямой push запрещён.
- Каждый PR проходит CI (lint, typecheck, build) и получает превью-деплой на Vercel.
- После слияния в `main` продакшен обновляется автоматически.

## Запуск

Нужны Node.js 22.12+ (версия закреплена в `.nvmrc`) и Docker.

```bash
nvm use
npm install
cp apps/api/.env.example apps/api/.env   # локальные настройки API: впишите секрет и ключи Google

npm run db:up        # Postgres в Docker (localhost:5433), включая тестовую базу
npm run db:migrate   # применить миграции

npm run dev          # приложение: http://localhost:5173 (Vite проксирует /api на API)
npm run dev:api      # API:        http://localhost:3001/api/health
```

Для входа через Google локально нужен OAuth-клиент в Google Cloud Console с адресом возврата
`http://localhost:5173/api/auth/callback/google`.

Команды запускаются из корня репозитория:

- `npm run build` — проверка типов и сборка фронтенда
- `npm run typecheck` — проверка типов во всех пакетах
- `npm run lint` / `npm run lint:fix` — ESLint по всему монорепозиторию (strict + type-checked, `any` запрещён)
- `npm test` — тесты API на настоящем Postgres (база `job_tracker_test`)
- `npm run db:generate` — создать миграцию после изменения схемы в `apps/api/src/db/schema.ts`
- `npm run db:studio` — Drizzle Studio, просмотр данных в браузере
- `npm run db:down` — остановить Postgres (данные сохраняются в Docker volume)

## API

Все маршруты `/api/vacancies` требуют входа (иначе `401`) и работают только с вакансиями
текущего пользователя: чужая вакансия неотличима от несуществующей — `404`.

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/api/health` | Проверка работоспособности и связи с базой (без входа) |
| `GET` / `POST` | `/api/auth/*` | Better Auth: вход через Google, callback, выход, `get-session` |
| `GET` | `/api/vacancies` | Список вакансий (новые отклики первыми) |
| `GET` | `/api/vacancies/:id` | Вакансия по id |
| `POST` | `/api/vacancies` | Создать вакансию |
| `PUT` | `/api/vacancies/:id` | Обновить вакансию целиком |
| `PATCH` | `/api/vacancies/:id/status` | Сменить статус |
| `DELETE` | `/api/vacancies/:id` | Удалить вакансию вместе с историей |

Тело запросов проверяется той же схемой `vacancyInputSchema`, что и форма на фронтенде.
Ошибка валидации — `400 { error: "validation_error", issues: [{ path, message }] }`.
Каждая смена статуса записывается в отдельную таблицу `vacancy_status_changes`.

## Деплой

Vercel + Neon (Postgres), сборка через [Build Output API](https://vercel.com/docs/build-output-api/v3)
скриптом `scripts/build-vercel.ts` (`npm run build:vercel`):

1. на Vercel применяет миграции к базе окружения — у продакшена основная база Neon,
   у каждого превью своя ветка базы, поэтому миграции из PR не трогают продакшен;
2. собирает фронтенд в `.vercel/output/static`;
3. упаковывает API esbuild'ом в одну серверную функцию `.vercel/output/functions/api.func`;
4. маршрутизирует `/api/*` в функцию, остальное — статика. Фронтенд и API на одном домене.

Переменные окружения: `DATABASE_URL`, `DATABASE_URL_UNPOOLED` прописывает интеграция Neon;
`BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` заданы вручную для Production и Preview.

## Авторизация

[Better Auth](https://www.better-auth.com) + Google OAuth, сессии в httpOnly-cookie,
таблицы `user` / `session` / `account` / `verification` — в нашей базе, в тех же миграциях Drizzle.

- Фронтенд и API на одном домене, поэтому cookie работают без CORS и сторонних cookie.
- Google принимает только заранее зарегистрированные адреса возврата, а у превью они каждый раз новые.
  Плагин `oAuthProxy`: на превью вход идёт через продакшен-адрес, после чего пользователь
  возвращается на превью с сессией. Доверенными считаются только превью этой команды Vercel.
- Вакансии принадлежат пользователю (`vacancies.user_id`, внешний ключ с каскадным удалением).
- Тесты используют настоящий Better Auth с плагином `testUtils`: пользователи и подписанные сессии
  создаются без Google, проверяются `401`, подделка cookie и изоляция данных между пользователями.

## Структура

Монорепозиторий на npm workspaces:

```
apps/web         — фронтенд (React + Vite + Tailwind)
apps/api         — API (Hono + Drizzle + Postgres)
packages/shared  — общие Zod-схемы и типы
```

- `packages/shared` — единый источник правды о данных: из схем выводятся типы TypeScript,
  а строгая схема ввода (`vacancyInputSchema`) проверяет форму на фронтенде и будет проверять запросы в API.
- `apps/web/src`:
  - `types` — UI-типы (форма, фильтры, статистика) и реэкспорт доменных типов
  - `constants` — статусы, их подписи и цвета, ключ хранилища
  - `hooks` — `useLocalStorage`, `useVacancies` (CRUD), `useFilteredVacancies`, `useStats`
  - `utils` — форматирование, валидация формы через общую схему, разбор данных из хранилища
  - `components` — UI по разделам: `auth`, `kanban`, `table`, `stats`, `filters`, `vacancy`, `ui`, `layout`
  - `lib/auth-client.ts` — клиент Better Auth (вход через Google, сессия, выход)
- `apps/api`:
  - `src/app.ts` — приложение Hono без привязки к рантайму (зависимости передаются снаружи);
    `index.ts` запускает его на Node, `vercel.ts` — точка входа серверной функции
  - `src/auth.ts` — настройки Better Auth (Google, oAuthProxy для превью) и адрес сайта для каждого окружения
  - `src/db` — схема Drizzle (включая таблицы Better Auth), подключение, миграции; SQL-миграции лежат в `drizzle/`
  - `src/vacancies` — репозиторий (работа с базой) и маршруты
  - `test` — интеграционные тесты через `app.request()` на тестовой базе

## Как считается статистика

«Дошли до собеседования» — вакансии, которые хотя бы раз были в статусе «Собеседование» или «Оффер»
(по истории статусов), поэтому отказ после собеседования тоже учитывается.
