import { test, expect, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { differenceInCalendarMonths, format, parse, parseISO } from 'date-fns';
import { expectNoHorizontalOverflow, expectTapTargets } from './helpers';

/**
 * Bookings at each screen size: phones get a card list and bottom sheets,
 * tablets and desktop a table and a side panel. Mock dataset only.
 */
const width = (page: Page) => page.viewportSize()?.width ?? 1440;

async function ready(page: Page, path = '/stays/bookings') {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1, name: 'Reservations' })).toBeVisible();
  await expect(page.getByRole('tab', { name: /^All\s*11$/ })).toBeVisible();
}

const bookingRow = (page: Page) => page.getByRole(width(page) >= 768 ? 'row' : 'listitem', {
  name: 'Open reservation TG-S-20494 for Kwame Agyeman',
});

/** Open a DatePicker in `scope` and click the target day. */
async function pickDate(page: Page, scope: Locator, label: string, iso: string) {
  await scope.getByLabel(label).click();
  // A previous picker may still be running its closing animation.
  const calendar = page.locator('[role="dialog"][aria-label="Choose date"][data-state="open"]');
  const target = parseISO(iso);
  const caption = (await calendar.getByRole('status').textContent()) ?? '';
  const shownMonth = parse(caption, 'LLLL yyyy', new Date());
  const months = differenceInCalendarMonths(target, shownMonth);
  const nav = months > 0 ? 'Go to the Next Month' : 'Go to the Previous Month';
  for (let step = 0; step < Math.abs(months); step += 1) {
    await calendar.getByRole('button', { name: nav }).click();
  }
  await calendar.getByRole('button', { name: format(target, 'PPPP') }).click();
  await expect(page.locator('[role="dialog"][aria-label="Choose date"]')).toHaveCount(0);
}

test('a row opens the booking panel; Escape closes it and returns focus to the row', async ({ page }) => {
  await ready(page);
  const row = bookingRow(page);
  await row.focus();
  await page.keyboard.press('Enter');

  const panel = page.getByRole('dialog', { name: 'Kwame Agyeman' });
  await expect(panel).toBeVisible();
  await expect(page).toHaveURL(/bookingId=TG-S-20494/);
  await expect(panel.getByRole('button', { name: 'Confirm reservation' })).toBeVisible();
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
  await panel.getByRole('button', { name: 'Confirm reservation' }).click();
  await expect(panel.getByRole('button', { name: 'Check in guest' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tab', { name: /^New\s*1$/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: /^Confirmed\s*5$/ })).toBeVisible();
});

test('filters apply from the sheet and show as removable chips', async ({ page }) => {
  await ready(page);
  await page.getByRole('button', { name: 'Filters' }).click();
  const sheet = page.getByRole('dialog', { name: 'Filter reservations' });
  // Sarah (Oct 4) and Kwame (Oct 10) have fixed seed dates; others move with today.
  await pickDate(page, sheet, 'From', '2026-10-04');
  await pickDate(page, sheet, 'To', '2026-10-10');
  await sheet.getByRole('button', { name: 'Show 2 reservations' }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByText(/^2 reservations/)).toBeVisible();
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
