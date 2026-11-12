import type { Currency, StatusChange, Vacancy, VacancyStatus } from '../types/vacancy';

const DAY_MS = 24 * 60 * 60 * 1000;

interface DemoSeed {
  company: string;
  position: string;
  salary: { min?: number; max?: number; currency: Currency };
  /** Этапы с числом дней назад: первый — сам отклик */
  path: [VacancyStatus, number][];
  notes?: string;
}

// Вымышленные компании: демо не должно выглядеть как реальные отклики
const SEEDS: DemoSeed[] = [
  {
    company: 'Северный код',
    position: 'Frontend-разработчик',
    salary: { min: 220_000, max: 280_000, currency: 'RUB' },
    path: [['applied', 21], ['test', 17], ['interview', 10], ['offer', 2]],
    notes: 'Оффер до пятницы. Гибрид, 2 дня в офисе.',
  },
  {
    company: 'Пиксель Лаб',
    position: 'React-разработчик',
    salary: { min: 180_000, max: 230_000, currency: 'RUB' },
    path: [['applied', 14], ['interview', 6]],
    notes: 'Техническое интервью в четверг: React, TypeScript, архитектура.',
  },
  {
    company: 'ДатаПоток',
    position: 'Frontend Engineer',
    salary: { min: 3_500, max: 4_500, currency: 'USD' },
    path: [['applied', 12], ['test', 5]],
    notes: 'Тестовое: дашборд на React + графики, срок — неделя.',
  },
  {
    company: 'Облачные системы',
    position: 'Middle Frontend-разработчик',
    salary: { min: 200_000, currency: 'RUB' },
    path: [['applied', 9]],
  },
  {
    company: 'Финтех Лаб',
    position: 'TypeScript-разработчик',
    salary: { max: 260_000, currency: 'RUB' },
    path: [['applied', 25], ['interview', 18], ['rejected', 11]],
    notes: 'Отказ после финала: искали больше опыта с микрофронтендами.',
  },
  {
    company: 'Студия Фокус',
    position: 'UI-разработчик',
    salary: { currency: 'RUB' },
    path: [['applied', 4]],
  },
  {
    company: 'Маркет-платформа',
    position: 'Frontend-разработчик (Vue/React)',
    salary: { min: 190_000, max: 240_000, currency: 'RUB' },
    path: [['applied', 16], ['rejected', 13]],
  },
  {
    company: 'Медиа Ось',
    position: 'Senior Frontend',
    salary: { min: 4_000, max: 5_000, currency: 'EUR' },
    path: [['applied', 2]],
  },
];

function isoDaysAgo(now: number, days: number): string {
  return new Date(now - days * DAY_MS).toISOString();
}

/** Примерные вакансии для демо на стартовой странице. Создаются заново — даты всегда относительно сегодня */
export function createDemoVacancies(now = Date.now()): Vacancy[] {
  return SEEDS.map((seed, index): Vacancy => {
    const statusHistory: StatusChange[] = seed.path.map(([status, days]) => ({
      status,
      changedAt: isoDaysAgo(now, days),
    }));
    const first = statusHistory[0];
    const last = statusHistory.at(-1);
    if (!first || !last) throw new Error(`Demo seed ${seed.company} has no statuses`);
    return {
      id: `demo-${String(index + 1)}`,
      company: seed.company,
      position: seed.position,
      salary: seed.salary,
      appliedAt: first.changedAt.slice(0, 10),
      status: last.status,
      statusHistory,
      rank: 0, // проставляется ниже, после сортировки
      ...(seed.notes === undefined ? {} : { notes: seed.notes }),
      createdAt: first.changedAt,
      updatedAt: last.changedAt,
    };
  })
    .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
    // Как у новых пользователей после миграции: в каждой колонке свежие отклики сверху
    .map((vacancy, index) => ({ ...vacancy, rank: index }));
}
