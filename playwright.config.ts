import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

process.env.ENV = 'stage';
dotenv.config({ path: `./env/.env.${process.env.ENV}` });

export default defineConfig({
  testDir: './e2e/tests',
  timeout: 30 * 1000,
  expect: { timeout: 10 * 1000 },
  retries: 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: process.env.BASE_URL,
    trace: 'on-first-retry',
    headless: true,
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        deviceScaleFactor: undefined,
        storageState: 'e2e/.auth/auth.json',
        viewport: null,
        launchOptions: { args: ['--start-maximized'] },
      },
    },
  ],
});