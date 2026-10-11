import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke tests for the web <-> API seam.
 *
 * These run against a real dev server and a real API. The point is the
 * BOUNDARY: every assertion below has either broken in production or was the
 * reason a page silently degraded.
 *
 * `webServer` starts Vite itself, so `npm run test:e2e` works from a clean
 * checkout. The API is expected on :5001 (the Vite proxy target).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
