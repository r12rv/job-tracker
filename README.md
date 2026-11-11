# Трекер откликов на вакансии

[![CI](https://github.com/r12rv/job-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/r12rv/job-tracker/actions/workflows/ci.yml)

**Демо:** https://job-tracker-olive-one.vercel.app

React + TypeScript + Vite + Tailwind CSS. Данные хранятся в `localStorage` браузера.

## Процесс разработки

- Изменения попадают в `main` только через pull request; прямой push запрещён.
- Каждый PR проходит CI (lint, typecheck, build) и получает превью-деплой на Vercel.
- После слияния в `main` продакшен обновляется автоматически.

## Запуск

Нужна Node.js 22.12+ (версия закреплена в `.nvmrc`).

```bash
nvm use
npm install
npm run dev       # фронтенд: http://localhost:5173
npm run dev:api   # API:      http://localhost:3001/api/health
```

Команды запускаются из корня репозитория:

- `npm run build` — проверка типов и сборка фронтенда
- `npm run typecheck` — проверка типов во всех пакетах
- `npm run lint` / `npm run lint:fix` — ESLint по всему монорепозиторию (strict + type-checked, `any` запрещён)

## Структура

Монорепозиторий на npm workspaces:

```
apps/web         — фронтенд (React + Vite + Tailwind)
apps/api         — API (Hono), пока заготовка с /api/health
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
- `apps/api/src/app.ts` — приложение Hono без привязки к рантайму; `index.ts` запускает его на Node.

## Как считается статистика

«Дошли до собеседования» — вакансии, которые хотя бы раз были в статусе «Собеседование» или «Оффер»
(по истории статусов), поэтому отказ после собеседования тоже учитывается.
