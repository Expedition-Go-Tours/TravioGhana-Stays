import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts', './src/test/mocks/server.ts'],
    css: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      // Matches .env.example; MSW intercepts every request, nothing leaves the test.
      VITE_API_BASE_URL: 'https://api.travioghana.com/api',
      // Component tests assert against the in-feature dataset. Without this,
      // a developer's `.env` (VITE_STAYS_DATA_SOURCE=api) leaks into Vitest
      // and every Stays page test fails trying to reach the network.
      VITE_STAYS_DATA_SOURCE: 'mock',
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**', // Exclude E2E tests (run with Playwright)
      '**/.{idea,git,cache,output,temp}/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.config.js',
        '**/*.config.ts',
        '**/dist/**',
        '**/.{idea,git,cache,output,temp}/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
