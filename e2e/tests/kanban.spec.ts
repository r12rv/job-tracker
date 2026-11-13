import { card, column, dragTo, expect, expectColumn, stat, test } from '../fixtures';

test.describe('канбан: перетаскивание', () => {
  test.beforeEach(async ({ signIn, seed, page }) => {
    await signIn();
    // Создаются по очереди, новые встают наверх: в «Отклике» будет В, Б, А
    await seed([
      { company: 'А' },
      { company: 'Б' },
      { company: 'В' },
      { company: 'Икс', status: 'interview' },
    ]);
    await page.goto('/');
    await expectColumn(page, 'Отклик', ['В', 'Б', 'А']);
  });

  test('перенос в другую колонку меняет статус и сохраняется', async ({ page }) => {
    await dragTo(page, card(page, 'А'), column(page, 'Собеседование'), 'bottom', { settle: true });

    await expectColumn(page, 'Собеседование', ['Икс', 'А']);
    await expectColumn(page, 'Отклик', ['В', 'Б']);
    await expect(stat(page, 'Дошли до собеседования')).toHaveText('2');

    await page.reload();
    await expectColumn(page, 'Собеседование', ['Икс', 'А']);
  });

  test('перестановка внутри колонки сохраняется после перезагрузки', async ({ page }) => {
    await dragTo(page, card(page, 'А'), card(page, 'В'), 'top');
    await expectColumn(page, 'Отклик', ['А', 'В', 'Б']);

    await page.reload();
    await expectColumn(page, 'Отклик', ['А', 'В', 'Б']);
  });

  test('карточку можно бросить в пустую колонку', async ({ page }) => {
    await expect(column(page, 'Оффер')).toContainText('Пусто');
    await dragTo(page, card(page, 'Б'), column(page, 'Оффер'));
    await expectColumn(page, 'Оффер', ['Б']);
    await page.reload();
    await expectColumn(page, 'Оффер', ['Б']);
  });

  test('с клавиатуры: пробел, стрелки, пробел — с озвучкой для скринридера', async ({ page }) => {
    // Озвучка dnd-kit — скрытая live-область; после каждого шага ждём её, как пользователь скринридера
    const announcer = page.locator('[aria-live="assertive"]');
    await card(page, 'В').focus();
    await page.keyboard.press('Space');
    await expect(announcer).toHaveText('«В»: место 1 из 3 в колонке «Отклик».');
    // dnd-kit начинает слушать стрелки со следующего такта, чтобы сам пробел не засчитался шагом
    await page.waitForTimeout(100);
    await page.keyboard.press('ArrowDown');
    await expect(announcer).toHaveText('«В»: место 2 из 3 в колонке «Отклик».');
    await page.keyboard.press('ArrowDown');
    await expect(announcer).toHaveText('«В»: место 3 из 3 в колонке «Отклик».');
    await page.keyboard.press('Space');
    await expect(announcer).toHaveText('«В» перенесена: место 3 из 3 в колонке «Отклик».');

    await expectColumn(page, 'Отклик', ['Б', 'А', 'В']);
    await page.reload();
    await expectColumn(page, 'Отклик', ['Б', 'А', 'В']);
  });

  test('Escape отменяет перетаскивание с клавиатуры', async ({ page }) => {
    await card(page, 'В').focus();
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');
    await expectColumn(page, 'Отклик', ['В', 'Б', 'А']);
  });

  test('кнопки внутри карточки не запускают перетаскивание', async ({ page }) => {
    await page.getByRole('button', { name: 'Редактировать: Б' }).click();
    await expect(page.getByRole('dialog', { name: 'Редактирование вакансии' })).toBeVisible();
  });
});
