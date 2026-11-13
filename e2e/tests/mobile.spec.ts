import type { Page } from '@playwright/test';
import { card, expect, expectColumn, test } from '../fixtures';

/** Страница не должна прокручиваться вбок — частая поломка мобильной вёрстки */
async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
}

test.describe('телефон', () => {
  test('стартовая страница помещается по ширине, демо открывается', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Войти через Google' })).toBeVisible();
    await expectNoHorizontalScroll(page);

    await page.getByRole('link', { name: 'Посмотреть демо ↓' }).click();
    await expect(page.getByRole('heading', { name: 'Попробуйте прямо здесь' })).toBeInViewport();
    await expectNoHorizontalScroll(page);
  });

  test('трекер: добавление вакансии и смена статуса', async ({ page, signIn }) => {
    await signIn();
    await page.goto('/');
    await expectNoHorizontalScroll(page);

    // На узком экране кнопка в шапке — только иконка, но с понятной подписью для скринридера
    await page.getByRole('banner').getByRole('button', { name: 'Добавить вакансию' }).tap();
    const dialog = page.getByRole('dialog', { name: 'Новая вакансия' });
    await dialog.getByRole('textbox', { name: 'Компания', exact: true }).fill('Мобильная');
    await dialog.getByRole('textbox', { name: 'Должность', exact: true }).fill('React Native');
    await dialog.getByRole('button', { name: 'Добавить' }).tap();
    await expect(dialog).toBeHidden();

    await expectColumn(page, 'Отклик', ['Мобильная']);
    await page.getByRole('combobox', { name: 'Статус: Мобильная' }).selectOption('interview');
    await expectColumn(page, 'Собеседование', ['Мобильная']);
    await expect(card(page, 'Мобильная')).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});
