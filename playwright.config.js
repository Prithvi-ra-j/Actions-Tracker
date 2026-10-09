import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4174';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 90_000,
    timezoneId: 'UTC',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: '**/mobile-smoke.spec.js',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      testMatch: '**/mobile-smoke.spec.js',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 393, height: 851 },
        deviceScaleFactor: 2.75,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: 'npm run dev -- --host 127.0.0.1 --port 4174 --strictPort',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VITE_SUPABASE_URL: 'https://test-project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
});