import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectNoHorizontalOverflow, expectTapTargets } from './helpers';

/**
 * The app shell at each screen size (projects: mobile 375, tablet 820,
 * desktop 1440 — see playwright.config.ts).
 *   phones   a drawer behind the menu button
 *   tablets  a 72px icon rail
 *   desktop  a 272px sidebar that collapses to the rail and remembers it
 */
const width = (page: Page) => page.viewportSize()?.width ?? 1440;

async function ready(page: Page, path = '/stays') {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

test.describe('phones: navigation drawer', () => {
  test.beforeEach(({ page }) => test.skip(width(page) >= 768, 'phones only'));

  test('opens, traps the page behind it, and closes on Escape', async ({ page }) => {
    await ready(page);
    await expect(page.getByRole('complementary', { name: 'Workspace' })).toBeHidden();
    // While the drawer is open the page behind is hidden from assistive tech, hence includeHidden.
    const menu = page.getByRole('button', { name: 'Open menu', includeHidden: true });
    await menu.click();

    const drawer = page.getByRole('dialog', { name: 'Menu' });
    await expect(drawer).toBeVisible();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    // Background scroll is locked while it is open.
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden');
    await expectTapTargets(page, '[role="dialog"]');

    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(menu).toBeFocused();
  });

  test('closes after choosing a page', async ({ page }) => {
    await ready(page);
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('dialog', { name: 'Menu' }).getByRole('link', { name: 'Bookings' }).click();
    await expect(page).toHaveURL(/\/stays\/bookings$/);
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden();
  });
});

test.describe('tablets: icon rail', () => {
  test.beforeEach(({ page }) => test.skip(width(page) < 768 || width(page) >= 1024, 'tablets only'));

  test('shows a 72px rail with named links and tooltips', async ({ page }) => {
    await ready(page);
    const rail = page.getByRole('complementary', { name: 'Workspace' });
    await expect(rail).toBeVisible();
    expect(Math.round((await rail.boundingBox())!.width)).toBe(72);
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeHidden();

    const finance = rail.getByRole('link', { name: 'Finance' });
    await finance.focus();
    await expect(page.getByRole('tooltip', { name: 'Finance' })).toBeVisible();
    await expectTapTargets(page, '#app-sidebar');
  });
});

test.describe('desktop: collapsible sidebar', () => {
  test.beforeEach(({ page }) => test.skip(width(page) < 1024, 'desktop only'));

  test('collapses to the rail and stays collapsed after a reload', async ({ page }) => {
    await ready(page);
    const sidebar = page.getByRole('complementary', { name: 'Workspace' });
    expect(Math.round((await sidebar.boundingBox())!.width)).toBe(272);

    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    await expect.poll(async () => Math.round((await sidebar.boundingBox())!.width)).toBe(72);
    // The header and content move with it.
    await expect.poll(async () => Math.round((await page.locator('header').boundingBox())!.x)).toBe(72);

    await page.reload();
    await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
    expect(Math.round((await sidebar.boundingBox())!.width)).toBe(72);
  });

  test('sign out asks first, and works from the collapsed rail', async ({ page }) => {
    await ready(page);
    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    await page.getByRole('complementary', { name: 'Workspace' }).getByRole('button', { name: 'Sign out' }).click();
    const confirm = page.getByRole('alertdialog', { name: 'Sign out of the dashboard?' });
    await expect(confirm).toBeVisible();
    await expect(confirm.getByRole('button', { name: 'Stay signed in' })).toBeFocused();
    await confirm.getByRole('button', { name: 'Stay signed in' }).click();
    await expect(confirm).toBeHidden();
  });
});

test.describe('every size', () => {
  test('nothing hides under the header', async ({ page }) => {
    await ready(page);
    const header = await page.locator('header').boundingBox();
    const heading = await page.getByRole('heading', { level: 1 }).boundingBox();
    expect(heading!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
  });

  test('a skip link jumps to the main content', async ({ page }) => {
    await ready(page);
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skip).toBeFocused();
    await skip.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
  });

  test('Cmd/Ctrl+K opens search and Enter goes to the page', async ({ page }) => {
    await ready(page);
    await page.keyboard.press('ControlOrMeta+k');
    const input = page.getByRole('combobox', { name: 'Search pages' });
    await expect(input).toBeFocused();
    await input.fill('payout');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/stays\/(finance|settings)/);
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('fits the screen', async ({ page }) => {
    await ready(page);
    await expectNoHorizontalOverflow(page);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`shell passes axe checks (${theme})`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('stays-theme', t), theme);
      await ready(page);
      if (width(page) < 768) await page.getByRole('button', { name: 'Open menu' }).click();
      const scope = width(page) < 768 ? '[role="dialog"]' : '#app-sidebar';
      const results = await new AxeBuilder({ page })
        .include('header')
        .include(scope)
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
      expect(summary).toEqual([]);
    });
  }
});
