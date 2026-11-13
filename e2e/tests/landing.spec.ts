import { expectColumn, dragTo, expect, stat, test } from '../fixtures';

test.describe('стартовая страница (гость)', () => {
  test('показывает первый экран и кнопку входа', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Все отклики на вакансии — в одном месте' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Войти через Google' })).toBeVisible();
    // Без входа рабочих кнопок трекера нет
    await expect(page.getByRole('button', { name: 'Добавить вакансию' })).toHaveCount(0);
  });

  test('«Посмотреть демо» прокручивает к живому демо', async ({ page }) => {
    await page.goto('/');
    const demo = page.locator('#demo');
    await expect(demo).not.toBeInViewport();
    await page.getByRole('link', { name: 'Посмотреть демо ↓' }).click();
    await expect(page).toHaveURL(/#demo$/);
    await expect(demo.getByRole('heading', { name: 'Попробуйте прямо здесь' })).toBeInViewport();
  });

  test('в демо меняется статус, и статистика пересчитывается', async ({ page }) => {
    await page.goto('/#demo');
    await expect(stat(page, 'Офферы')).toHaveText('1');
    await page.getByRole('combobox', { name: 'Статус: Пиксель Лаб' }).selectOption('offer');
    await expect(stat(page, 'Офферы')).toHaveText('2');
    await expectColumn(page, 'Оффер', ['Пиксель Лаб', 'Северный код']);
  });

  test('в демо можно перетащить карточку в другую колонку', async ({ page }) => {
    await page.goto('/#demo');
    const card = page.getByRole('listitem', { name: /^Облачные системы,/ });
    await dragTo(page, card, page.getByRole('region', { name: 'Тестовое', exact: true }), 'bottom');
    await expectColumn(page, 'Тестовое', ['ДатаПоток', 'Облачные системы']);
  });

  test('редактирование в демо предлагает войти', async ({ page }) => {
    await page.goto('/#demo');
    await page.getByRole('button', { name: 'Редактировать: Медиа Ось' }).click();
    await expect(page.getByText('Редактирование доступно после входа')).toBeVisible();
  });

  test('«Войти через Google» ведёт на страницу входа Google', async ({ page }) => {
    // Наружу не ходим: отвечаем за Google заглушкой и проверяем только адрес перехода
    await page.route('https://accounts.google.com/**', (route) => route.fulfill({ status: 200, body: 'Google' }));
    await page.goto('/');
    await page.getByRole('button', { name: 'Войти через Google' }).click();
    await page.waitForURL(/accounts\.google\.com/);
    const url = new URL(page.url());
    expect(url.searchParams.get('client_id')).toBe('e2e-google-client-id');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:5180/api/auth/callback/google');
  });
});
