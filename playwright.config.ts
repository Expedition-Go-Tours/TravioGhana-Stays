import { defineConfig } from '@playwright/test';

/**
 * E2E runs against the mock dataset: no backend, no credentials.
 * The dev server is started for you; an already-running one is reused.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4317',
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 4317 --strictPort',
    url: 'http://127.0.0.1:4317',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
