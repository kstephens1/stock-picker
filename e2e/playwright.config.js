// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: [
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
  ],
});
