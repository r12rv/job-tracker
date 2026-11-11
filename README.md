# Трекер откликов на вакансии

React + TypeScript + Vite + Tailwind CSS. Данные хранятся в `localStorage` браузера.

## Запуск

Нужна Node.js 22.12+ (версия закреплена в `.nvmrc`).

```bash
nvm use
npm install
npm run dev
```

- `npm run build` — проверка типов и сборка
- `npm run typecheck` — только проверка типов
- `npm run lint` / `npm run lint:fix` — ESLint (strict + type-checked, `any` запрещён)

## Структура

- `src/types` — типы предметной области
- `src/constants` — статусы, их подписи и цвета, ключ хранилища
- `src/hooks` — `useLocalStorage`, `useVacancies` (CRUD), `useFilteredVacancies`, `useStats`
- `src/utils` — форматирование, валидация формы, проверка данных из хранилища
- `src/components` — UI по разделам: `kanban`, `table`, `stats`, `filters`, `vacancy`, `ui`, `layout`

## Как считается статистика

«Дошли до собеседования» — вакансии, которые хотя бы раз были в статусе «Собеседование» или «Оффер»
(по истории статусов), поэтому отказ после собеседования тоже учитывается.
