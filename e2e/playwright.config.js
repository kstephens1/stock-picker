// @ts-check
const { defineConfig } = require('@playwright/test');

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const useLocalWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER !== '1';

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: useLocalWebServer
    ? [
      {
        command: 'cd ../server && npm start',
        port: 4000,
        reuseExistingServer: !process.env.CI,
      },
      {
        command: 'cd ../client && npm start',
        port: 3000,
        reuseExistingServer: !process.env.CI,
        timeout: 60000,
      },
    ]
    : undefined,
});
