import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the Stays workspace, run against the mock dataset.
 *
 * These assert the things that actually break on an extraction: the session
 * bootstraps without a backend, the shell renders the Stays navigation, and the
 * workspace pages mount without runtime errors.
 */
const STAYS_NAV = [
  'Dashboard',
  'Properties',
  'Bookings',
  'Customers',
  'Availability',
  'Rate',
  'Reviews',
  'Special Offers',
  'Cancellation',
  'Analytics',
  'Finance',
];

test('boots into the Stays dashboard with a mock session', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await expect(page).toHaveURL(/\/stays$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/partner/i);

  const nav = page.locator('nav');
  for (const label of STAYS_NAV) {
    await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
  }

  expect(errors).toEqual([]);
});

test('properties list shows the seeded listing', async ({ page }) => {
  await page.goto('/stays/properties');
  await expect(page.getByRole('heading', { level: 1, name: 'Properties' })).toBeVisible();
  await expect(page.getByText('Akwaaba Coast Hotel')).toBeVisible();
});

test.describe('workspace pages mount cleanly', () => {
  for (const path of [
    '/stays/bookings',
    '/stays/availability',
    '/stays/rates',
    '/stays/special-offers',
    '/stays/finance',
    '/stays/reviews',
    '/stays/analytics',
    '/stays/settings',
  ]) {
    test(`${path} renders`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));

      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
});
