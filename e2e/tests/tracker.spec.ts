import { card, expectColumn, expect, stat, test } from '../fixtures';

test.describe('трекер (после входа)', () => {
  test.beforeEach(async ({ signIn }) => {
    await signIn('Анна Тестова');
  });

  test('новый пользователь видит пустой трекер и своё имя в меню', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Пока нет откликов' })).toBeVisible();
    await expect(stat(page, 'Всего откликов')).toHaveText('0');
    await page.getByRole('button', { name: 'Профиль: Анна Тестова' }).click();
    await expect(page.getByRole('menu')).toContainText('Анна Тестова');
  });

  test('добавление вакансии через форму, с проверкой ошибок', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Добавить вакансию' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Новая вакансия' });

    // Пустая форма и неверные данные не уходят на сервер
    await dialog.getByRole('textbox', { name: 'Ссылка на вакансию' }).fill('ссылка с пробелами');
    await dialog.getByRole('textbox', { name: 'От', exact: true }).fill('300000');
    await dialog.getByRole('textbox', { name: 'До', exact: true }).fill('100000');
    await dialog.getByRole('button', { name: 'Добавить' }).click();
    await expect(dialog.getByText('Укажите компанию')).toBeVisible();
    await expect(dialog.getByText('Укажите должность')).toBeVisible();
    await expect(dialog.getByText('Некорректная ссылка')).toBeVisible();
    await expect(dialog.getByText('Максимум меньше минимума')).toBeVisible();

    await dialog.getByRole('textbox', { name: 'Компания', exact: true }).fill('Северный код');
    await dialog.getByRole('textbox', { name: 'Должность', exact: true }).fill('Frontend-разработчик');
    await dialog.getByRole('textbox', { name: 'Ссылка на вакансию' }).fill('https://hh.ru/vacancy/1');
    await dialog.getByRole('textbox', { name: 'До', exact: true }).fill('350000');
    await dialog.getByRole('combobox', { name: 'Статус', exact: true }).selectOption('test');
    await dialog.getByRole('button', { name: 'Добавить' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText('Вакансия добавлена')).toBeVisible();
    await expectColumn(page, 'Тестовое', ['Северный код']);
    await expect(card(page, 'Северный код')).toContainText('300 000 – 350 000 ₽');

    // Данные на сервере, а не в памяти вкладки
    await page.reload();
    await expectColumn(page, 'Тестовое', ['Северный код']);
  });

  test('редактирование вакансии', async ({ page, seed }) => {
    await seed([{ company: 'Пиксель Лаб', notes: 'Старая заметка' }]);
    await page.goto('/');
    await page.getByRole('button', { name: 'Редактировать: Пиксель Лаб' }).click();
    const dialog = page.getByRole('dialog', { name: 'Редактирование вакансии' });
    await expect(dialog.getByRole('textbox', { name: 'Компания', exact: true })).toHaveValue('Пиксель Лаб');
    await dialog.getByRole('textbox', { name: 'Заметки' }).fill('Техническое интервью в четверг');
    await dialog.getByRole('button', { name: 'Сохранить' }).click();
    await expect(dialog).toBeHidden();

    await page.reload();
    await expect(card(page, 'Пиксель Лаб')).toContainText('Техническое интервью в четверг');
  });

  test('удаление с подтверждением', async ({ page, seed }) => {
    await seed([{ company: 'Оставить' }, { company: 'Удалить' }]);
    await page.goto('/');

    // Отмена ничего не удаляет
    await page.getByRole('button', { name: 'Удалить: Удалить' }).click();
    await page.getByRole('dialog', { name: 'Удалить вакансию?' }).getByRole('button', { name: 'Отмена' }).click();
    await expect(card(page, 'Удалить')).toBeVisible();

    await page.getByRole('button', { name: 'Удалить: Удалить' }).click();
    await page.getByRole('dialog', { name: 'Удалить вакансию?' }).getByRole('button', { name: 'Удалить' }).click();
    await expect(card(page, 'Удалить')).toBeHidden();

    await page.reload();
    await expectColumn(page, 'Отклик', ['Оставить']);
  });

  test('смена статуса пересчитывает статистику и сохраняется в истории', async ({ page, seed }) => {
    await seed([{ company: 'Альфа' }, { company: 'Бета' }]);
    await page.goto('/');
    await expect(stat(page, 'Дошли до собеседования')).toHaveText('0');

    await page.getByRole('combobox', { name: 'Статус: Альфа' }).selectOption('interview');
    await expect(stat(page, 'Дошли до собеседования')).toHaveText('1');
    await expect(stat(page, 'Процент приглашений')).toHaveText('50%');

    // Отказ после собеседования всё равно считается «дошли до собеседования» — по истории статусов
    await page.getByRole('combobox', { name: 'Статус: Альфа' }).selectOption('rejected');
    await page.reload();
    await expect(stat(page, 'Дошли до собеседования')).toHaveText('1');
    await expectColumn(page, 'Отказ', ['Альфа']);
  });

  test('поиск по компании и фильтр по статусу', async ({ page, seed }) => {
    await seed([
      { company: 'Яндекс' },
      { company: 'Ozon', status: 'interview' },
      { company: 'Яндекс Маркет', status: 'offer' },
    ]);
    await page.goto('/');

    await page.getByRole('searchbox', { name: 'Поиск по компании' }).fill('яндекс');
    await expect(page.getByText('2 из 3')).toBeVisible();
    await expect(card(page, 'Ozon')).toBeHidden();

    await page.getByRole('radio', { name: /Оффер/ }).click();
    await expect(page.getByText('1 из 3')).toBeVisible();
    await expect(card(page, 'Яндекс Маркет')).toBeVisible();
    await expect(card(page, 'Яндекс')).toBeHidden();

    await page.getByRole('searchbox', { name: 'Поиск по компании' }).fill('nothing');
    await expect(page.getByRole('heading', { name: 'Ничего не найдено' })).toBeVisible();
    await page.getByRole('button', { name: 'Сбросить фильтры' }).click();
    await expect(page.getByText('3 из 3')).toBeVisible();
  });

  test('таблица показывает вакансии, выбранный вид запоминается', async ({ page, seed }) => {
    await seed([{ company: 'Альфа', appliedAt: '2026-11-01' }, { company: 'Бета', appliedAt: '2026-11-05' }]);
    await page.goto('/');
    await page.getByRole('tab', { name: 'Таблица' }).click();

    const rows = page.getByRole('row');
    await expect(rows.nth(1)).toContainText('Бета'); // свежие отклики сверху
    await expect(rows.nth(2)).toContainText('Альфа');

    await page.reload();
    await expect(page.getByRole('tab', { name: 'Таблица' })).toHaveAttribute('aria-selected', 'true');
  });

  test('выход возвращает на стартовую страницу', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Профиль: Анна Тестова' }).click();
    await page.getByRole('menuitem', { name: 'Выйти' }).click();
    await expect(page.getByRole('heading', { name: 'Все отклики на вакансии — в одном месте' })).toBeVisible();

    // Сессия действительно закрыта на сервере
    await page.reload();
    await expect(page.getByRole('button', { name: 'Войти через Google' })).toBeVisible();
    expect((await page.request.get('/api/vacancies')).status()).toBe(401);
  });

  test('пользователи не видят вакансии друг друга', async ({ page, seed, signIn, context }) => {
    await seed([{ company: 'Моя вакансия' }]);
    await context.clearCookies();
    await signIn('Другой Пользователь');
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Пока нет откликов' })).toBeVisible();
    await expect(card(page, 'Моя вакансия')).toHaveCount(0);
  });
});
