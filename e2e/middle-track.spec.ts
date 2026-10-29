import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import { runExercise } from '../tools/learn.mjs';

const storageKey = 'angular-practicum.progress.v1';

test('both stages, later weeks and keyboard filters are available on desktop and mobile', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/roadmap');
  await expect(page.locator('.lesson-row')).toHaveCount(60);
  await expect(page.locator('.course-facts')).toContainText('180');
  const advanced = page.getByRole('button', { name: 'Продвинутый · 7–12', exact: true });
  await advanced.focus(); await page.keyboard.press('Enter');
  await expect(advanced).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.lesson-row')).toHaveCount(24);
  await expect(page.locator('#week-12 .week-number')).toHaveText('12');
  await expect(page.locator('#week-12 .lesson-row').first()).toContainText('3 часа');
  await expect(page.locator('#week-12 .lesson-row').last()).toContainText('6 часов');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByPlaceholder('Найти тему в курсе').fill('nothing987');
  await expect(page.getByRole('heading', { name: 'По этому запросу ничего не найдено' })).toBeVisible();
  await page.getByRole('button', { name: 'Показать весь курс' }).click();
  await expect(page.locator('.lesson-row')).toHaveCount(60);
  await page.getByRole('link', { name: 'Критерии итоговой защиты →' }).click();
  await expect(page).toHaveURL(/\/lessons\/w12-workshop$/);
  await expect(page.locator('.lesson-prose')).toContainText('критер');
  expect(errors).toEqual([]);
});

test('existing progress survives new lessons and a real advanced report without awarding mastery', async ({ page }) => {
  await page.addInitScript(key => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ schemaVersion: 1, lessonRecords: { 'w1-01': { readAt: '2026-10-20T10:00:00Z', masteredAt: '2026-10-20T11:00:00Z', practiceMode: 'independent' } }, attempts: [] }));
  }, storageKey);
  await page.goto('/lessons/w7-01');
  await expect(page.locator('.lesson-prose')).not.toBeEmpty();
  await page.getByRole('button', { name: 'Отметить прочитанным', exact: true }).click();
  await page.reload();
  await expect(page.getByLabel('Могу объяснить и повторить самостоятельно')).not.toBeChecked();
  const { report } = await runExercise('middle-01', { solutionPath: join(process.cwd(), 'author/solutions/middle-01/solution.mjs'), writeReport: false });
  expect(report.outcome).toBe('passed');
  await page.goto('/progress');
  await page.locator('input[type=file]').setInputFiles({ name: 'middle-report.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(report)) });
  await page.getByRole('button', { name: 'Сохранить объединённый прогресс' }).click();
  await expect(page.getByTestId('passed-count')).toHaveText('1');
  await expect(page.getByTestId('mastered-count')).toHaveText('1');
  await expect(page.getByTestId('read-count')).toHaveText('2');
  await expect(page.locator('.progress-week')).toHaveCount(12);
  const snapshot = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey);
  expect(snapshot.lessonRecords['w1-01'].masteredAt).toBe('2026-10-20T11:00:00Z');
  expect(snapshot.lessonRecords['w7-01'].masteredAt).toBeUndefined();
  expect(snapshot.attempts[0].exerciseId).toBe('middle-01');
});

test('advanced checked practice is discoverable by lesson and has real local instructions', async ({ page }) => {
  const warnings: string[] = [];
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) warnings.push(message.text()); });
  await page.goto('/training?lesson=w10-01');
  await expect(page.locator('.training-card')).toHaveCount(1);
  await expect(page.locator('.training-card-footer')).toContainText('w10-01');
  await page.locator('.training-card').click();
  await expect(page).toHaveURL(/\/training\/middle-07$/);
  await expect(page.locator('main')).toContainText('npm.cmd run learn -- check middle-07');
  await expect(page.locator('main')).toContainText('practice/middle/middle-07');
  await expect(page.locator('main')).toContainText('FormControl<string>');
  expect(warnings).toEqual([]);
});
