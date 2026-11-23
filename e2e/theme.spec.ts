import { test, expect, type Page } from '@playwright/test';

/**
 * Dark mode: the saved theme must be on <html> before the page body is
 * parsed (i.e. before first paint), so a dark-mode user never sees a white
 * flash, and the header menu must switch and remember it.
 */

/** Record <html>'s classes at the moment <body> is inserted — before any paint. */
async function recordClassAtBody(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __classAtBody?: string };
    // The init script runs before <html> exists, so watch the document itself.
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (node.nodeName === 'BODY' && w.__classAtBody === undefined) {
            w.__classAtBody = document.documentElement.className;
            observer.disconnect();
            return;
          }
        }
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  });
}

const classAtBody = (page: Page) =>
  page.evaluate(() => (window as unknown as { __classAtBody?: string }).__classAtBody ?? '');

test('a saved dark theme is applied before first paint', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('stays-theme', 'dark'));
  await recordClassAtBody(page);
  await page.goto('/stays');
  expect(await classAtBody(page)).toContain('dark');
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(background).toBe('rgb(18, 17, 15)');
});

test('"system" follows the OS colour scheme', async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: 'dark' });
  const page = await context.newPage();
  await recordClassAtBody(page);
  await page.goto('/stays');
  expect(await classAtBody(page)).toContain('dark');
  await context.close();
});

test('the header menu switches theme and the choice survives a reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/stays');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/dark/);

  // The avatar menu trigger is the last button in the header.
  await page.locator('header button[aria-haspopup="menu"]').last().click();
  await page.getByRole('menuitemradio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);

  await recordClassAtBody(page);
  await page.reload();
  expect(await classAtBody(page)).toContain('dark');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
