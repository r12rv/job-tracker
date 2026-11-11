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
cp apps/api/.env.example apps/api/.env   # локальные настройки API

npm run db:up        # Postgres в Docker (localhost:5433), включая тестовую базу
npm run db:migrate   # применить миграции

npm run dev          # фронтенд: http://localhost:5173
npm run dev:api      # API:      http://localhost:3001/api/health
```

Команды запускаются из корня репозитория:

- `npm run build` — проверка типов и сборка фронтенда
- `npm run typecheck` — проверка типов во всех пакетах
- `npm run lint` / `npm run lint:fix` — ESLint по всему монорепозиторию (strict + type-checked, `any` запрещён)
- `npm test` — тесты API на настоящем Postgres (база `job_tracker_test`)
- `npm run db:generate` — создать миграцию после изменения схемы в `apps/api/src/db/schema.ts`
- `npm run db:studio` — Drizzle Studio, просмотр данных в браузере
- `npm run db:down` — остановить Postgres (данные сохраняются в Docker volume)

## API

Пока работает локально; публикация вместе с авторизацией — следующие этапы.

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/api/health` | Проверка работоспособности |
| `GET` | `/api/vacancies` | Список вакансий (новые отклики первыми) |
| `GET` | `/api/vacancies/:id` | Вакансия по id |
| `POST` | `/api/vacancies` | Создать вакансию |
| `PUT` | `/api/vacancies/:id` | Обновить вакансию целиком |
| `PATCH` | `/api/vacancies/:id/status` | Сменить статус |
| `DELETE` | `/api/vacancies/:id` | Удалить вакансию вместе с историей |

Тело запросов проверяется той же схемой `vacancyInputSchema`, что и форма на фронтенде.
Ошибка валидации — `400 { error: "validation_error", issues: [{ path, message }] }`.
Каждая смена статуса записывается в отдельную таблицу `vacancy_status_changes`.

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
  - `components` — UI по разделам: `kanban`, `table`, `stats`, `filters`, `vacancy`, `ui`, `layout`
- `apps/api`:
  - `src/app.ts` — приложение Hono без привязки к рантайму (зависимости передаются снаружи); `index.ts` запускает его на Node
  - `src/db` — схема Drizzle, подключение, запуск миграций; SQL-миграции лежат в `drizzle/`
  - `src/vacancies` — репозиторий (работа с базой) и маршруты
  - `test` — интеграционные тесты через `app.request()` на тестовой базе

## Как считается статистика

«Дошли до собеседования» — вакансии, которые хотя бы раз были в статусе «Собеседование» или «Оффер»
(по истории статусов), поэтому отказ после собеседования тоже учитывается.
