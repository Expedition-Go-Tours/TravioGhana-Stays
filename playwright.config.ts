import { defineConfig, devices } from '@playwright/test';

/**
 * E2E always runs against the bundled mock dataset: no backend, no
 * credentials, and never the production API — even when a developer's `.env`
 * sets `VITE_STAYS_DATA_SOURCE=api`. The dev server is started with the data
 * source forced to `mock`, and an already-running server is never reused (it
 * may be the developer's api-mode server).
 *
 * Browser: system Chrome by default. Set `PW_CHANNEL=chromium` (or any other
 * channel) to use a different one, e.g. the bundled Chromium on CI.
 */
const PORT = 4317;
const channel = process.env.PW_CHANNEL || 'chrome';
const browser = channel === 'chromium' ? {} : { channel };

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], ...browser, viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: false },
    },
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], ...browser, viewport: { width: 820, height: 1180 }, hasTouch: true },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], ...browser, viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: { VITE_STAYS_DATA_SOURCE: 'mock' },
  },
});
