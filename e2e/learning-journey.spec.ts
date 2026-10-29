import { expect, test } from '@playwright/test';

test('new learner can read a lesson and retain separate progress', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/today');
  await expect(page.getByRole('heading', { name: 'От Java — к Angular.' })).toBeVisible();
  await page.getByRole('link', { name: 'Начать первый урок' }).click();
  await expect(page).toHaveURL(/\/lessons\/w1-01/);
  await expect(page.locator('.lesson-prose')).not.toBeEmpty();
  await page.getByRole('button', { name: 'Отметить прочитанным' }).click();
  await page.getByLabel('Могу объяснить и повторить самостоятельно').check();
  await page.reload();
  await expect(page.getByLabel('Могу объяснить и повторить самостоятельно')).toBeChecked();
  await page.getByRole('link', { name: 'Прогресс', exact: true }).click();
  await expect(page.getByTestId('read-count')).toHaveText('1');
  await expect(page.getByTestId('mastered-count')).toHaveText('1');
  await expect(page.getByTestId('passed-count')).toHaveText('0');
  expect(errors).toEqual([]);
});

test('roadmap search, unknown lesson and mobile navigation work', async ({ page }) => {
  await page.goto('/roadmap');
  await page.getByPlaceholder('Найти тему в курсе').fill('RxJS');
  await expect(page.locator('.lesson-row').first()).toBeVisible();
  await page.getByPlaceholder('Найти тему в курсе').fill('несуществующая тема 987');
  await expect(page.getByText('По этому запросу ничего не найдено')).toBeVisible();
  await page.goto('/lessons/missing');
  await expect(page.getByRole('heading', { name: 'Урок не найден' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/today');
  await page.getByRole('button', { name: 'Открыть меню' }).click();
  await page.getByRole('link', { name: 'Роадмап', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Твой маршрут' })).toBeVisible();
  await expect(page.locator('.sidebar')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('invalid import changes nothing and backup export is downloadable', async ({ page }) => {
  await page.goto('/progress');
  await page.locator('input[type=file]').setInputFiles({
    name: 'invalid.json', mimeType: 'application/json',
    buffer: Buffer.from('{"schemaVersion":99,"lessonRecords":{},"attempts":[]}')
  });
  await expect(page.getByRole('alert')).toContainText('верси');
  await expect(page.getByTestId('read-count')).toHaveText('0');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Экспорт прогресса' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^angular-progress-.*\.json$/);
});

test('lesson contents and hints work with keyboard navigation', async ({ page }) => {
  await page.goto('/lessons/w1-01');
  const target = page.locator('.lesson-prose h2').filter({ hasText: 'Практика в IDE' });
  await expect(target).toBeAttached();
  const tocButton = page.locator('.toc').getByRole('button', { name: 'Практика в IDE', exact: true });
  await tocButton.focus();
  await page.keyboard.press('Enter');
  await expect(target).toBeInViewport();
  const hint = page.locator('.lesson-prose details').first();
  await hint.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(hint).toHaveAttribute('open', '');
});

test('clipboard denial keeps the lesson and completion controls visible', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new Error('Clipboard disabled')) }
    });
  });
  await page.goto('/lessons/w1-04');
  await expect(page.locator('.lesson-prose')).not.toBeEmpty();
  await page.getByRole('button', { name: 'Копировать', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('скопируй текст вручную');
  await expect(page.locator('.lesson-prose')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Отметить прочитанным' })).toBeAttached();
});

test('skip link preserves the current lesson and focuses its content', async ({ page }) => {
  await page.goto('/lessons/w2-03');
  const skip = page.getByRole('link', { name: 'Перейти к содержимому' });
  await skip.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/lessons\/w2-03/);
  await expect(page.locator('main')).toBeFocused();
});

test('missing lesson content offers retry and planned content stays explicitly unavailable', async ({ page }) => {
  await page.route('**/content/lessons/w1-01.md', route => route.fulfill({ status: 404, body: 'missing' }));
  await page.goto('/lessons/w1-01');
  await expect(page.getByRole('alert')).toContainText('Не удалось прочитать урок');
  await page.unroute('**/content/lessons/w1-01.md');
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await expect(page.locator('.lesson-prose')).not.toBeEmpty();
  await page.route('**/content/curriculum.json', async route => {
    const response = await route.fetch();
    const course = await response.json();
    course.lessons.find((lesson: { id: string }) => lesson.id === 'w1-01').readiness = 'planned';
    await route.fulfill({ json: course });
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Этот урок готовится' })).toBeVisible();
  await expect(page.locator('.lesson-prose')).toHaveCount(0);
});

test('desktop and narrow layouts remain readable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto('/today');
  await expect(page.getByRole('link', { name: 'Начать первый урок' })).toBeVisible();
  await page.screenshot({ path: '.cache/preview-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.cache/preview-mobile.png', fullPage: true });
  await page.goto('/lessons/w4-04');
  await expect(page.locator('.lesson-prose')).not.toBeEmpty();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const code = page.locator('.lesson-prose pre').first();
  await code.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.cache/preview-lesson-mobile.png' });
});

test('local teaching illustrations load relative to the lesson source', async ({ page }) => {
  await page.goto('/lessons/w1-04');
  const diagram = page.getByRole('img', { name: 'original и alias ссылаются на один объект, copy — на другой' });
  await expect(diagram).toHaveAttribute('src', /\/content\/assets\/object-references\.svg$/);
  await expect.poll(() => diagram.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
});
