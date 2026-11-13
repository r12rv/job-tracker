import { card, column, dragTo, expect, expectColumn, test } from '../fixtures';

/**
 * Поведение при сбоях: Playwright подменяет ответы сервера,
 * и мы проверяем, что интерфейс откатывает изменения и честно об этом говорит.
 */
test.describe('ошибки сервера', () => {
  test.beforeEach(async ({ signIn }) => {
    await signIn();
  });

  test('смена статуса откатывается, «Повторить» применяет её', async ({ page, seed }) => {
    await seed([{ company: 'Альфа' }]);
    await page.goto('/');

    await page.route('**/api/vacancies/*/status', (route) => route.fulfill({ status: 500, json: { error: 'internal_error' } }));
    await page.getByRole('combobox', { name: 'Статус: Альфа' }).selectOption('offer');

    await expect(page.getByText('Статус не изменён')).toBeVisible();
    await expectColumn(page, 'Отклик', ['Альфа']);
    await expectColumn(page, 'Оффер', []);

    // Сервер «починился» — повтор из уведомления срабатывает
    await page.unroute('**/api/vacancies/*/status');
    await page.getByRole('button', { name: 'Повторить' }).click();
    await expectColumn(page, 'Оффер', ['Альфа']);
    await page.reload();
    await expectColumn(page, 'Оффер', ['Альфа']);
  });

  test('без сети перетаскивание откатывается с понятным сообщением', async ({ page, seed }) => {
    await seed([{ company: 'Альфа' }]);
    await page.goto('/');

    await page.route('**/api/vacancies/*/move', (route) => route.abort('internetdisconnected'));
    await dragTo(page, card(page, 'Альфа'), column(page, 'Тестовое'));

    await expect(page.getByText('Нет соединения с сервером')).toBeVisible();
    await expectColumn(page, 'Отклик', ['Альфа']);
  });

  test('удаление откатывается, если сервер ответил ошибкой', async ({ page, seed }) => {
    await seed([{ company: 'Альфа' }]);
    await page.goto('/');

    await page.route('**/api/vacancies/*', (route) =>
      route.request().method() === 'DELETE' ? route.fulfill({ status: 500, json: {} }) : route.fallback(),
    );
    await page.getByRole('button', { name: 'Удалить: Альфа' }).click();
    await page.getByRole('dialog', { name: 'Удалить вакансию?' }).getByRole('button', { name: 'Удалить' }).click();

    await expect(page.getByText('Вакансия не удалена')).toBeVisible();
    await expect(card(page, 'Альфа')).toBeVisible();
  });

  test('ошибка при создании оставляет форму открытой с введёнными данными', async ({ page }) => {
    await page.goto('/');
    await page.route('**/api/vacancies', (route) =>
      route.request().method() === 'POST' ? route.fulfill({ status: 500, json: {} }) : route.fallback(),
    );
    await page.getByRole('button', { name: 'Добавить вакансию' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Новая вакансия' });
    await dialog.getByRole('textbox', { name: 'Компания', exact: true }).fill('Не потеряется');
    await dialog.getByRole('textbox', { name: 'Должность', exact: true }).fill('Frontend');
    await dialog.getByRole('button', { name: 'Добавить' }).click();

    await expect(page.getByText('Не удалось добавить вакансию')).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('textbox', { name: 'Компания', exact: true })).toHaveValue('Не потеряется');
  });

  test('если сервер недоступен при открытии, показывается экран с повтором, а не вход', async ({ page }) => {
    await page.route('**/api/auth/get-session', (route) => route.abort('connectionrefused'));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Сервер недоступен' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Все отклики на вакансии — в одном месте' })).toHaveCount(0);

    await page.unroute('**/api/auth/get-session');
    await page.getByRole('button', { name: 'Повторить' }).click();
    await expect(page.getByRole('heading', { name: 'Пока нет откликов' })).toBeVisible();
  });
});
