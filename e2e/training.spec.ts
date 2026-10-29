import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('training catalogue filters by type and lesson and restores URL navigation', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/training');
  await expect(page.locator('.training-card')).toHaveCount(54);
  await page.getByRole('combobox', { name: 'Тип', exact: true }).selectOption('bug');
  await expect(page.locator('.training-card')).toHaveCount(12);
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Тип', exact: true })).toHaveValue('bug');
  await expect(page.locator('.training-card')).toHaveCount(12);
  await page.getByLabel('Найти тему').fill('неттакойтемы987');
  await expect(page.getByRole('heading', { name: 'Ничего не найдено' })).toBeVisible();
  await page.getByRole('button', { name: 'Сбросить фильтры' }).click();
  await expect(page.locator('.training-card')).toHaveCount(54);
  await page.getByRole('combobox', { name: 'После урока', exact: true }).selectOption('w3-03');
  await expect(page.locator('.training-card').first()).toBeVisible();
  await expect(page.locator('.training-card-footer').first()).toContainText('w3-03');
  await page.goBack();
  await expect(page.locator('.training-card')).toHaveCount(54);
  expect(errors).toEqual([]);
});

test('review requires own reasoning and resets reveals between tasks while retaining history', async ({ page }) => {
  await page.goto('/training/review-01');
  await expect(page.getByRole('button', { name: 'Открыть разбор', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Сохранить попытку' })).toBeDisabled();
  await page.getByRole('combobox', { name: 'Решение', exact: true }).selectOption('changes');
  await page.getByLabel('Наблюдение и доказательство').fill('Проверил сценарий с пустым массивом: значение должно остаться корректным.');
  await page.getByRole('button', { name: 'Сохранить попытку' }).click();
  await page.getByRole('button', { name: 'Открыть разбор', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Скрыть разбор' })).toBeVisible();
  await page.getByRole('button', { name: 'Открыть следующую подсказку' }).click();
  await expect(page.locator('.hint')).toHaveCount(1);
  await page.locator('.related-link').first().click();
  await expect(page.getByLabel('Наблюдение и доказательство')).toBeEmpty();
  await expect(page.locator('.hint')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Скрыть разбор' })).toHaveCount(0);
  await page.goto('/training/review-01');
  await expect(page.locator('.attempt-note')).toContainText('Проверил сценарий');
  await expect(page.getByRole('button', { name: 'Открыть разбор', exact: true })).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('angular-practicum.training.v1')!));
  expect(stored.attempts).toHaveLength(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('angular-practicum.progress.v1') || '{"lessonRecords":{}}').lessonRecords)).toEqual({});
});

test('ticket follow-up opens after attempt and bug diagnostics import into the existing progress flow', async ({ page }) => {
  await page.goto('/training/ticket-01');
  await expect(page.getByRole('heading', { name: 'Следующее требование от команды' })).toHaveCount(0);
  await page.getByLabel('Наблюдение и доказательство').fill('Нашёл поток параметров URL и проверил возврат Back после изменения фильтра.');
  await page.getByRole('button', { name: 'Сохранить попытку' }).click();
  await page.getByRole('button', { name: 'Показать / скрыть продолжение' }).click();
  await expect(page.getByRole('heading', { name: 'Следующее требование от команды' })).toBeVisible();
  const items = JSON.parse(await readFile('content/training/bugs.json', 'utf8'));
  const exercise = items[0].exercise;
  const report = { schemaVersion: 1, runId: '12345678-1234-4000-8000-000000000001', exerciseId: exercise.id, assessmentRevision: exercise.assessmentRevision, finishedAt: new Date().toISOString(), outcome: 'failed', checks: exercise.requiredCheckIds.map((id: string) => ({ id, status: 'failed', message: 'Проверка повторного поиска после ошибки не пройдена.' })) };
  await page.goto('/progress');
  await page.locator('input[type=file]').setInputFiles({ name: 'report.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(report)) });
  await page.getByRole('button', { name: 'Сохранить объединённый прогресс' }).click();
  await page.goto(`/training/${exercise.id}`);
  await expect(page.getByText('Последняя проверка не пройдена')).toBeVisible();
  await page.goto(`/journal?source=${exercise.id}`);
  await expect(page.getByText('Непройденные условия последнего запуска')).toBeVisible();
});

test('journal persists mistakes, deduplicates backup, rejects malformed import and preserves course progress', async ({ page }) => {
  await page.goto('/journal?source=review-01');
  await page.getByLabel('Что пошло не так').fill('После мутации список на экране остался старым');
  await page.getByLabel('Как я ошибочно это представлял').fill('Я думал, что любое изменение объекта обновляет computed');
  await page.getByLabel('Как механизм работает на самом деле').fill('Зависимость отслеживает значение сигнала. Проверю новую ссылку.');
  await page.getByRole('button', { name: 'Сохранить ошибку', exact: true }).click();
  await expect(page.locator('.journal-entry')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.journal-entry')).toHaveCount(1);
  await page.locator('.journal-entry textarea').fill('На другом примере заменил массив целиком; вычисление обновилось при чтении.');
  await page.getByRole('button', { name: 'Объяснил самостоятельно' }).click();
  await expect(page.locator('.journal-entry .attempt-note')).toHaveCount(1);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Экспорт журнала' }).click();
  const downloaded = await downloadPromise, file = await downloaded.path();
  const backup = await readFile(file!, 'utf8');
  await page.locator('input[type=file]').setInputFiles({ name: 'journal.json', mimeType: 'application/json', buffer: Buffer.from(backup) });
  await page.getByRole('button', { name: 'Объединить журнал' }).click();
  await expect(page.locator('.journal-entry')).toHaveCount(1);
  await expect(page.locator('.journal-entry .attempt-note')).toHaveCount(1);
  const invalid = JSON.parse(backup); invalid.mistakes[0].nextId = 'unknown';
  await page.locator('input[type=file]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(invalid)) });
  await expect(page.getByRole('alert')).toContainText('новый');
  await expect(page.locator('.journal-entry')).toHaveCount(1);
  await page.locator('input[type=file]').setInputFiles({ name: 'null.json', mimeType: 'application/json', buffer: Buffer.from('null') });
  await expect(page.getByRole('alert')).toContainText('экспорт тренажёра');
  const conflict = JSON.parse(backup); conflict.mistakes[0].hypothesis = 'Конфликтующая версия ответа с другого устройства';
  await page.locator('input[type=file]').setInputFiles({ name: 'conflict.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(conflict)) });
  await page.getByRole('button', { name: 'Объединить журнал' }).click();
  await expect(page.getByRole('alert')).toContainText('Конфликт');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('angular-practicum.training.v1')!).mistakes[0].hypothesis)).toContain('Я думал');
  await page.goto('/progress');
  await expect(page.getByTestId('mastered-count')).toHaveText('0');
});

test('corrupt journal stays intact while new attempts can be exported', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('angular-practicum.training.v1', '{broken'));
  await page.goto('/training/review-01');
  await expect(page.getByRole('status')).toContainText('повреждён');
  await page.getByRole('combobox', { name: 'Решение', exact: true }).selectOption('accept');
  await page.getByLabel('Наблюдение и доказательство').fill('Собственное объяснение на новом примере без подсказки');
  await page.getByRole('button', { name: 'Сохранить попытку' }).click();
  await page.getByRole('link', { name: 'Экспорт журнала' }).click();
  expect(await page.evaluate(() => localStorage.getItem('angular-practicum.training.v1'))).toBe('{broken');
  const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Экспорт журнала' }).click();
  const download = await downloadPromise;
  expect(JSON.parse(await readFile((await download.path())!, 'utf8')).attempts).toHaveLength(1);
  await expect(page.getByRole('button', { name: 'Скачать исходные данные' })).toBeVisible();
});

test('a due mistake recommends a different example on Today without changing mastery', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('angular-practicum.training.v1', JSON.stringify({
    schemaVersion: 1, attempts: [], recalls: [],
    mistakes: [{ id: '00000000-0000-4000-8000-000000000001', itemId: 'review-01', nextId: 'review-02', createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), symptom: 'Ожидал другой результат', hypothesis: 'Я неправильно понял зависимость', explanation: 'Механизм проверяется новым примером' }]
  })));
  await page.goto('/today');
  await expect(page.getByRole('heading', { name: 'Вернуться к своей ошибке' })).toBeVisible();
  await expect(page.locator('.review-section a[href="/training/review-02"]')).toBeVisible();
  await page.getByRole('link', { name: 'Прогресс', exact: true }).click();
  await expect(page.getByTestId('mastered-count')).toHaveText('0');
});

for (const [id, variants] of Object.entries({ 'event-loop': ['simple', 'nested'], rxjs: ['switch', 'merge'], signals: ['replace', 'mutate'], di: ['root', 'local'], forms: ['disabled', 'blur'] })) {
  test(`interactive mechanism ${id} requires prediction, steps and resets in both scenarios`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`/mechanisms/${id}`);
    await expect(page.getByRole('button', { name: 'Проверить по шагам' })).toBeDisabled();
    for (const variant of variants) {
      await page.getByRole('combobox', { name: 'Сценарий', exact: true }).selectOption(variant);
      await page.getByRole('radio').first().check();
      await page.getByRole('button', { name: 'Проверить по шагам' }).click();
      await expect(page.getByRole('button', { name: '← Предыдущий шаг' })).toBeDisabled();
      const steps = Number((await page.locator('.step-header .tag').innerText()).split('/')[1].trim());
      for (let index = 1; index < steps; index++) {
        await page.getByRole('button', { name: 'Следующий шаг →' }).click();
        await expect(page.locator('.step-header .tag')).toHaveText(`Шаг ${index + 1} / ${steps}`);
      }
      await expect(page.locator('.model-conclusion')).toBeVisible();
      await expect(page.locator('.simulation .notice')).toContainText('Прогноз');
      await page.getByRole('button', { name: '← Предыдущий шаг' }).click();
      await expect(page.locator('.model-conclusion')).toHaveCount(0);
      await page.getByRole('button', { name: 'Сначала', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Проверить по шагам' })).toBeDisabled();
    }
    expect(errors).toEqual([]);
  });
}

test('expanded pages fit mobile and keyboard controls; screenshots show real state', async ({ page }) => {
  await page.goto('/training');
  await expect(page.locator('.training-card')).toHaveCount(54);
  await page.screenshot({ path: join(tmpdir(), 'angular-training-desktop.png'), fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const url of ['/training', '/training/bug-01', '/training/review-01', '/journal', '/mechanisms/rxjs']) {
    await page.goto(url);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  const first = page.getByRole('radio').first(); await first.focus(); await page.keyboard.press('Space');
  await expect(first).toBeChecked();
  await page.getByRole('button', { name: 'Проверить по шагам' }).click();
  await page.getByRole('button', { name: 'Следующий шаг →' }).click();
  await page.screenshot({ path: join(tmpdir(), 'angular-mechanism-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Открыть меню' }).click();
  await page.getByRole('link', { name: 'Практика', exact: true }).click();
  await expect(page.locator('.sidebar')).toBeHidden();
  await page.screenshot({ path: join(tmpdir(), 'angular-training-mobile.png'), fullPage: false });
});
