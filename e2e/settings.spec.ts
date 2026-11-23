import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTapTargets } from './helpers';

/**
 * Settings is the longest form surface in the workspace, so it gets its own
 * layout checks: every tab must fit a 360px-class viewport, the deep links must
 * survive the split, and the sticky save bar must only exist on phones.
 */
const TABS = ['profile', 'notifications', 'payouts', 'security', 'tax', 'team'] as const;

const width = (page: import('@playwright/test').Page) => page.viewportSize()?.width ?? 0;

test.describe('settings: every tab fits the viewport', () => {
  for (const tab of TABS) {
    test(`${tab} has no horizontal overflow`, async ({ page }) => {
      await page.goto(`/stays/settings?tab=${tab}`);
      await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
      await page.waitForLoadState('networkidle');
      await expectNoHorizontalOverflow(page);
    });
  }
});

test('tab deep links select the tab and keep the URL', async ({ page }) => {
  await page.goto('/stays/settings?tab=team');
  await expect(page.getByRole('tab', { name: 'Team' })).toHaveAttribute('aria-selected', 'true');
  expect(new URL(page.url()).searchParams.get('tab')).toBe('team');
});

test.describe('settings: sticky save bar', () => {
  test('appears after an edit on a phone', async ({ page }) => {
    test.skip(width(page) >= 1024, 'desktop uses the form footer button');

    await page.goto('/stays/settings?tab=profile');
    const name = page.getByRole('textbox').first();
    await expect(name).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeHidden();

    await name.fill('Akwaaba Coast Hotel Ltd');
    await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeVisible();
  });

  test('stays out of the way on desktop', async ({ page }) => {
    test.skip(width(page) < 1024, 'phone-only affordance');

    await page.goto('/stays/settings?tab=profile');
    const name = page.getByRole('textbox').first();
    await expect(name).toBeVisible();
    await name.fill('Akwaaba Coast Hotel Ltd');
    await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeHidden();
  });
});

test('settings section tabs meet the tap-target minimum', async ({ page }) => {
  await page.goto('/stays/settings?tab=profile');
  await expect(page.getByRole('tablist', { name: 'Settings sections' })).toBeVisible();
  await expectTapTargets(page, '[role="tablist"]');
});
