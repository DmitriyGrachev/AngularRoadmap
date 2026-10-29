import { expect, test, type Page } from '@playwright/test';
import { mkdtemp, readFile, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runExercise, verifyAuthor } from '../tools/learn.mjs';

const storageKey = 'angular-practicum.progress.v1';
let passedReport: Record<string, unknown>;
let failedReport: Record<string, unknown>;

test.beforeAll(async () => {
  [passedReport] = await verifyAuthor();
  const directory = await mkdtemp(join(tmpdir(), 'angular-transfer-reports-'));
  const solutionPath = join(directory, 'incorrect.mjs');
  try {
    await writeFile(solutionPath, 'export const filterIssues = () => []; export const labelIssues = () => [];');
    ({ report: failedReport } = await runExercise('w1-04-ex1', { solutionPath, writeReport: false }));
  } finally {
    await unlink(solutionPath);
    await rmdir(directory);
  }
  expect(passedReport.outcome).toBe('passed');
  expect(failedReport.outcome).toBe('failed');
});

async function previewImport(page: Page, value: unknown) {
  await page.locator('input[type=file]').setInputFiles({
    name: 'progress.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value))
  });
  await expect(page.getByRole('heading', { name: 'Проверь импорт перед сохранением' })).toBeVisible();
}

async function confirmImport(page: Page) {
  await page.getByRole('button', { name: 'Сохранить объединённый прогресс' }).click();
  await expect(page.getByRole('heading', { name: 'Проверь импорт перед сохранением' })).toHaveCount(0);
}

async function downloadContent(page: Page, buttonName: string) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: buttonName, exact: true }).click();
  const download = await pending;
  const path = await download.path();
  expect(path).not.toBeNull();
  return readFile(path!, 'utf8');
}

test('real reports deduplicate, latest failure remains visible and an export transfers to a clean profile', async ({ page, browser }) => {
  await page.goto('/progress');
  await expect(page.getByTestId('passed-count')).toHaveText('0');
  await previewImport(page, passedReport);
  await confirmImport(page);
  await expect(page.getByTestId('passed-count')).toHaveText('1');

  await page.goto('/lessons/w1-04');
  await expect(page.getByText('Последняя проверка: пройдена', { exact: false })).toBeVisible();
  await page.goto('/progress');
  await previewImport(page, passedReport);
  await confirmImport(page);
  await expect(page.locator('.attempt-section .attempt')).toHaveCount(1);

  await previewImport(page, failedReport);
  await confirmImport(page);
  await expect(page.getByTestId('passed-count')).toHaveText('0');
  await expect(page.locator('.attempt-section .attempt')).toHaveCount(2);
  await expect(page.locator('.attempt-section .attempt').first()).toContainText('Есть ошибки');
  await expect(page.locator('.attempt-section .attempt').last()).toContainText('Проверки пройдены');

  await page.goto('/lessons/w1-04');
  await expect(page.getByText('Последняя проверка: есть ошибки', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Отметить прочитанным' }).click();
  await page.getByLabel('Как получилось выполнить практику?').selectOption('independent');
  await page.getByLabel('Могу объяснить и повторить самостоятельно').check();
  await page.goto('/progress');
  await expect(page.getByTestId('read-count')).toHaveText('1');
  const backup = JSON.parse(await downloadContent(page, 'Экспорт прогресса'));
  expect(backup.attempts.map((attempt: { runId: string }) => attempt.runId).sort()).toEqual([passedReport.runId, failedReport.runId].sort());

  const freshContext = await browser.newContext();
  try {
    const fresh = await freshContext.newPage();
    await fresh.goto(new URL('/progress', page.url()).href);
    await expect(fresh.getByTestId('read-count')).toHaveText('0');
    await expect(fresh.locator('.attempt-section .attempt')).toHaveCount(0);
    await previewImport(fresh, backup);
    await confirmImport(fresh);
    await expect(fresh.getByTestId('read-count')).toHaveText('1');
    await expect(fresh.getByTestId('mastered-count')).toHaveText('1');
    await expect(fresh.getByTestId('passed-count')).toHaveText('0');
    await expect(fresh.locator('.attempt-section .attempt')).toHaveCount(2);
    await fresh.reload();
    await expect(fresh.getByTestId('read-count')).toHaveText('1');
    await fresh.goto(new URL('/lessons/w1-04', page.url()).href);
    await expect(fresh.getByText('Последняя проверка: есть ошибки', { exact: false })).toBeVisible();
    await expect(fresh.getByLabel('Могу объяснить и повторить самостоятельно')).toBeChecked();
  } finally { await freshContext.close(); }
});

test('a cleared mastery conflict shows dates and reviews before replacing the chosen whole record', async ({ page }) => {
  const localRecord = {
    startedAt: '2026-10-01T10:00:00Z', readAt: '2026-10-01T11:00:00Z', masteredAt: null,
    practiceMode: 'independent', reviews: [{ at: '2026-10-03T13:00:00Z', result: 'repeat' }]
  };
  const unrelated = { readAt: '2026-10-02T11:00:00Z' };
  const incomingRecord = {
    startedAt: '2026-10-02T10:00:00Z', readAt: '2026-10-01T11:00:00Z', masteredAt: '2026-10-01T12:00:00Z',
    practiceMode: 'independent', reviews: [{ at: '2026-10-03T13:00:00Z', result: 'remembered' }]
  };
  await page.goto('/progress');
  await previewImport(page, { schemaVersion: 1, lessonRecords: { 'w1-01': localRecord, 'w1-02': unrelated }, attempts: [] });
  await confirmImport(page);
  await previewImport(page, { schemaVersion: 1, lessonRecords: { 'w1-01': incomingRecord }, attempts: [] });
  const comparison = page.locator('.conflict-values');
  await expect(comparison).toContainText('Самооценка: снята');
  await expect(comparison).toContainText('Самооценка: подтверждена');
  await expect(comparison).toContainText('01.10.2026');
  await expect(comparison).toContainText('02.10.2026');
  await expect(comparison).toContainText('03.10.2026');
  await expect(comparison).toContainText('нужно повторить');
  await expect(comparison).toContainText('вспомнил самостоятельно');
  await expect(page.getByRole('button', { name: 'Сохранить объединённый прогресс' })).toBeDisabled();
  await page.getByLabel('Выбор записи w1-01').selectOption('incoming');
  await confirmImport(page);
  const snapshot = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey);
  expect(snapshot.lessonRecords['w1-01']).toEqual(incomingRecord);
  expect(snapshot.lessonRecords['w1-02']).toEqual(unrelated);
  await page.reload();
  await expect(page.getByTestId('mastered-count')).toHaveText('1');
});

test('corrupt browser storage stays available for recovery while new progress remains exportable', async ({ page }) => {
  const raw = '{"schemaVersion":1,"lessonRecords":broken';
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: storageKey, value: raw });
  await page.goto('/progress');
  await expect(page.getByRole('status')).toContainText('исходные данные не перезаписаны');
  expect(await downloadContent(page, 'Скачать исходные данные хранилища')).toBe(raw);
  await page.goto('/lessons/w1-01');
  await page.getByRole('button', { name: 'Отметить прочитанным' }).click();
  await page.getByRole('link', { name: 'Прогресс', exact: true }).click();
  await expect(page.getByTestId('read-count')).toHaveText('1');
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBe(raw);
  const exported = JSON.parse(await downloadContent(page, 'Экспорт прогресса'));
  expect(exported.lessonRecords['w1-01'].readAt).toBeTruthy();
  expect(await downloadContent(page, 'Скачать исходные данные хранилища')).toBe(raw);
});
