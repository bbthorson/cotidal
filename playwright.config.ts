import { defineConfig, devices } from '@playwright/test';

/**
 * Sandboxes and CI images often ship a Chromium that does not match the
 * revision Playwright expects, and run as root. Both are handled here so the
 * suite works without a `playwright install` or a local config override.
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
const launchArgs = process.env.PLAYWRIGHT_NO_SANDBOX ? ['--no-sandbox'] : [];

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'line' : 'html',
  use: {
    baseURL: 'http://localhost:9002',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { executablePath, args: launchArgs },
      },
    },
  ],
  // Set PLAYWRIGHT_SKIP_WEBSERVER to test against a server you started
  // yourself (or a deployed preview) instead of having Playwright spawn one.
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: process.env.CI ? 'npm run preview' : 'npm run dev',
        url: 'http://localhost:9002',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
});
