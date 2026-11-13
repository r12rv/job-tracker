import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';

/**
 * Автоматическая проверка доступности (axe-core): контраст, подписи полей и кнопок, роли, структура.
 * Падаем на серьёзных и критичных нарушениях — их видно сразу и их стоит чинить.
 */
async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  const serious = results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => ({
      rule: violation.id,
      help: violation.help,
      targets: violation.nodes.slice(0, 3).map((node) => node.target.join(' ')),
    }));
  expect(serious).toEqual([]);
}

test.describe('доступность', () => {
  test('стартовая страница с демо', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Попробуйте прямо здесь' })).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test('трекер с вакансиями: канбан и таблица', async ({ page, signIn, seed }) => {
    await signIn();
    await seed([
      { company: 'Альфа', url: 'https://hh.ru/vacancy/1', salary: { min: 200000, currency: 'RUB' }, notes: 'Заметка' },
      { company: 'Бета', status: 'interview' },
      { company: 'Гамма', status: 'rejected' },
    ]);
    await page.goto('/');
    await expect(page.getByRole('region', { name: 'Отклик', exact: true })).toBeVisible();
    await expectNoSeriousViolations(page);

    await page.getByRole('tab', { name: 'Таблица' }).click();
    await expectNoSeriousViolations(page);
  });

  test('форма вакансии', async ({ page, signIn }) => {
    await signIn();
    await page.goto('/');
    await page.getByRole('button', { name: 'Добавить вакансию' }).first().click();
    await page.getByRole('dialog', { name: 'Новая вакансия' }).getByRole('button', { name: 'Добавить' }).click();
    await expect(page.getByText('Укажите компанию')).toBeVisible();
    await expectNoSeriousViolations(page);
  });
});
