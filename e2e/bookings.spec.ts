import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectNoHorizontalOverflow, expectTapTargets } from './helpers';

/**
 * Bookings at each screen size: phones get a card list and bottom sheets,
 * tablets and desktop a table and a side panel. Mock dataset only.
 */
const width = (page: Page) => page.viewportSize()?.width ?? 1440;

async function ready(page: Page, path = '/stays/bookings') {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1, name: 'Bookings' })).toBeVisible();
  await expect(page.getByRole('tab', { name: /^All\s*7$/ })).toBeVisible();
}

const bookingRow = (page: Page) => page.getByRole(width(page) >= 768 ? 'row' : 'listitem', {
  name: 'Open booking TG-S-20494 for Kwame Agyeman',
});

test('a row opens the booking panel; Escape closes it and returns focus to the row', async ({ page }) => {
  await ready(page);
  const row = bookingRow(page);
  await row.focus();
  await page.keyboard.press('Enter');

  const panel = page.getByRole('dialog', { name: 'Kwame Agyeman' });
  await expect(panel).toBeVisible();
  await expect(page).toHaveURL(/bookingId=TG-S-20494/);
  await expect(panel.getByRole('button', { name: 'Confirm booking' })).toBeVisible();
  await expectTapTargets(page, '[role="dialog"]');

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(page).not.toHaveURL(/bookingId=/);
  await expect(row).toBeFocused();
});

test('confirming a booking updates its status and the New tab count', async ({ page }) => {
  // Opened from a link: the panel is up straight away and hides the page behind it.
  await page.goto('/stays/bookings?bookingId=TG-S-20494');
  const panel = page.getByRole('dialog', { name: 'Kwame Agyeman' });
  await panel.getByRole('button', { name: 'Confirm booking' }).click();
  await expect(panel.getByRole('button', { name: 'Check in guest' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tab', { name: /^New\s*0$/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: /^Confirmed\s*3$/ })).toBeVisible();
});

test('filters apply from the sheet and show as removable chips', async ({ page }) => {
  await ready(page);
  await page.getByRole('button', { name: 'Filters' }).click();
  const sheet = page.getByRole('dialog', { name: 'Filter bookings' });
  // Sarah (Oct 4) and Kwame (Oct 10) have fixed seed dates; others move with today.
  await sheet.getByLabel('From').fill('2026-10-04');
  await sheet.getByLabel('To').fill('2026-10-10');
  await sheet.getByRole('button', { name: 'Show 2 bookings' }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByText(/^2 bookings/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Remove filter: Check-in from/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('the toolbar and tabs fit the screen and meet tap-target size', async ({ page }) => {
  await ready(page);
  await expectNoHorizontalOverflow(page);
  await expectTapTargets(page, 'main');
});

test('no axe violations on the page or the booking panel', async ({ page }) => {
  await ready(page);
  const scan = async (scope: string) => {
    const results = await new AxeBuilder({ page })
      .include(scope)
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  };
  expect(await scan('main')).toEqual([]);

  await bookingRow(page).click();
  await expect(page.getByRole('dialog', { name: 'Kwame Agyeman' })).toBeVisible();
  expect(await scan('[role="dialog"]')).toEqual([]);
});
