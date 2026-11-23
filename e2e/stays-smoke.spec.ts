import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTapTargets, openNavIfCollapsed } from './helpers';

/**
 * Smoke coverage for the Stays workspace, run against the mock dataset at
 * mobile, tablet and desktop widths (see playwright.config.ts projects).
 *
 * These assert the things that actually break: the session bootstraps without
 * a backend, the shell renders the Stays navigation at every width, the
 * workspace pages mount without runtime errors, and nothing scrolls sideways.
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

const WORKSPACE_PAGES = [
  '/stays',
  '/stays/properties',
  '/stays/bookings',
  '/stays/availability',
  '/stays/rates',
  '/stays/special-offers',
  '/stays/finance',
  '/stays/reviews',
  '/stays/analytics',
  '/stays/settings',
];

test('boots into the Stays dashboard with a mock session', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await expect(page).toHaveURL(/\/stays$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await openNavIfCollapsed(page);
  const nav = page.getByRole('navigation', { name: /main|workspace/i }).or(page.locator('nav').first());
  for (const label of STAYS_NAV) {
    await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
  }

  expect(errors).toEqual([]);
});

test('properties list shows the seeded listing', async ({ page }) => {
  await page.goto('/stays/properties');
  await expect(page.getByRole('heading', { level: 1, name: 'Properties' })).toBeVisible();
  await expect(page.getByText('Akwaaba Coast Hotel').first()).toBeVisible();
});

test.describe('workspace pages mount cleanly', () => {
  for (const path of WORKSPACE_PAGES) {
    test(`${path} renders`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));

      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
});

test.describe('layout: no horizontal overflow', () => {
  for (const path of WORKSPACE_PAGES) {
    test(`${path} fits the viewport`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.waitForLoadState('networkidle');
      await expectNoHorizontalOverflow(page);
    });
  }
});

test.describe('shell: tap targets', () => {
  test('header controls are at least 44px', async ({ page }) => {
    await page.goto('/stays');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectTapTargets(page, 'header');
  });
});

test.describe('dev API status page', () => {
  test('refuses to run in mock mode and sends no requests to the live API', async ({ page }) => {
    const liveRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('api.travioghana.com')) liveRequests.push(request.url());
    });

    await page.goto('/stays/dev/api-status');
    await expect(page.getByRole('heading', { level: 1, name: /API status/ })).toBeVisible();
    await expect(page.getByText('This dev server is in mock mode.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run checks' })).toBeDisabled();
    expect(liveRequests).toEqual([]);
  });
});
