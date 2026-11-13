import { randomUUID } from 'node:crypto';
import { test as base, expect, type Locator, type Page } from '@playwright/test';
import { betterAuth } from 'better-auth';
import { testUtils } from 'better-auth/plugins';
import { sql } from 'drizzle-orm';
import { vacancySchema, type Vacancy, type VacancyInput } from '@job-tracker/shared';
import { authOptions } from '../apps/api/src/auth.ts';
import { createDb, type Db } from '../apps/api/src/db/client.ts';
import { assertE2eDatabase, AUTH_SECRET, BASE_URL, E2E_DATABASE_URL } from './env.ts';

interface WorkerFixtures {
  backend: { db: Db; signInAs: (name: string) => Promise<{ name: string; value: string }> };
}

interface TestFixtures {
  /** Очищает базу перед каждым тестом — тесты не зависят друг от друга */
  cleanDb: undefined;
  /** Входит под новым пользователем: создаёт его и сессию в базе и кладёт cookie в браузер */
  signIn: (name?: string) => Promise<void>;
  /** Создаёт вакансии через API от имени вошедшего пользователя (быстрее, чем заполнять форму) */
  seed: (vacancies: Partial<VacancyInput>[]) => Promise<Vacancy[]>;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  backend: [
    // eslint-disable-next-line no-empty-pattern -- Playwright требует деструктуризацию первого аргумента
    async ({}, use) => {
      assertE2eDatabase(E2E_DATABASE_URL);
      const { db, close } = createDb(E2E_DATABASE_URL);

      // Настоящий Better Auth с той же схемой, секретом и адресом, что у API e2e, плюс testUtils:
      // он создаёт пользователя и подписанную сессию без похода в Google
      const options = authOptions(db, {
        secret: AUTH_SECRET,
        baseURL: BASE_URL,
        trustedOrigins: [BASE_URL],
        google: { clientId: 'e2e-google-client-id', clientSecret: 'e2e-google-client-secret' },
      });
      const auth = betterAuth({ ...options, plugins: [...options.plugins, testUtils()] });
      const { test: utils } = await auth.$context;

      const signInAs = async (name: string) => {
        const user = await utils.saveUser(utils.createUser({ name, email: `${randomUUID()}@example.com` }));
        const cookie = (await utils.getAuthHeaders({ userId: user.id })).get('cookie') ?? '';
        const [cookieName = '', ...rest] = cookie.split('=');
        return { name: cookieName, value: rest.join('=') };
      };

      await use({ db, signInAs });
      await close();
    },
    { scope: 'worker' },
  ],

  cleanDb: [
    async ({ backend }, use) => {
      await backend.db.execute(
        sql`TRUNCATE "user", vacancies, vacancy_status_changes, session, account, verification CASCADE`,
      );
      await use(undefined);
    },
    { auto: true },
  ],

  signIn: async ({ backend, context }, use) => {
    await use(async (name = 'Тестовый Пользователь') => {
      const cookie = await backend.signInAs(name);
      await context.addCookies([{ ...cookie, url: BASE_URL, httpOnly: true, sameSite: 'Lax' }]);
    });
  },

  seed: async ({ page }, use) => {
    await use(async (list) => {
      const created: Vacancy[] = [];
      for (const overrides of list) {
        const input: VacancyInput = {
          company: 'Компания',
          position: 'Frontend-разработчик',
          salary: { currency: 'RUB' },
          appliedAt: '2026-11-10',
          status: 'applied',
          ...overrides,
        };
        // page.request использует cookie браузера — запрос идёт от имени вошедшего пользователя
        const response = await page.request.post('/api/vacancies', { data: input });
        expect(response.status()).toBe(201);
        created.push(vacancySchema.parse(await response.json()));
      }
      return created;
    });
  },
});

export { expect };

/** Колонка канбана по названию статуса */
export function column(page: Page, label: string): Locator {
  return page.getByRole('region', { name: label, exact: true });
}

/**
 * Проверяет компании в колонке сверху вниз — в том порядке, в каком их видит пользователь.
 * Ждёт, пока колонка придёт к этому состоянию (данные грузятся с сервера асинхронно).
 */
export async function expectColumn(page: Page, label: string, companies: string[]): Promise<void> {
  await expect(column(page, label).getByRole('heading', { level: 3 })).toHaveText(companies);
}

/** Карточка вакансии (её перетаскиваемая обёртка) по названию компании */
export function card(page: Page, company: string): Locator {
  return page.getByRole('listitem', { name: new RegExp(`^${company},`) });
}

/** Значение карточки статистики по подписи */
export function stat(page: Page, label: string): Locator {
  return page.locator('dt', { hasText: label }).locator('xpath=following-sibling::dd[1]');
}

/**
 * Перетаскивание мышью «как человек»: нажали, плавно повели, отпустили.
 * dnd-kit реагирует на движение (порог 5px), поэтому одного мгновенного переноса недостаточно.
 */
export async function dragTo(
  page: Page,
  source: Locator,
  target: Locator,
  position: 'top' | 'bottom' = 'top',
  { settle = false }: { settle?: boolean } = {},
) {
  // Мышь работает в координатах окна: карточка должна быть на экране, иначе нажатие уйдёт мимо
  await source.scrollIntoViewIfNeeded();
  const from = await source.boundingBox();
  if (!from) throw new Error('Карточка для перетаскивания не видна');
  const startX = from.x + from.width / 2;
  const startY = from.y + 12;

  /** Точка внутри цели; цель меряем заново — пока карточку несут, колонки меняют высоту */
  const aim = async () => {
    const box = await target.boundingBox();
    const viewport = page.viewportSize();
    if (!box || !viewport) throw new Error('Цель перетаскивания не видна');
    const y = position === 'top' ? box.y + 4 : box.y + box.height - 4;
    return { x: box.x + box.width / 2, y: Math.min(Math.max(y, 1), viewport.height - 2) };
  };

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 10, startY + 10, { steps: 5 });
  const first = await aim();
  await page.mouse.move(first.x, first.y, { steps: 20 });
  if (settle) {
    // Цель — колонка, которая выросла, приняв заготовку карточки: как человек, доводим курсор до её нового края
    const settled = await aim();
    await page.mouse.move(settled.x, settled.y, { steps: 5 });
  }
  await page.mouse.up();
}
