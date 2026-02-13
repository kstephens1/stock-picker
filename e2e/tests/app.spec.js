// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('StockPicker App', () => {
  test('should display the page title', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('StockPicker');
  });

  test('should display Stock Picker message and matching timestamp from the microservice', async ({ page }) => {
    // Set up a listener for the API response
    const responsePromise = page.waitForResponse('**/api/hello');
    
    await page.goto('/');
    
    const response = await responsePromise;
    const responseData = await response.json();
    const expectedTimestamp = new Date(responseData.timestamp).toLocaleString();

    const message = page.getByTestId('hello-message');
    await expect(message).toBeVisible({ timeout: 10000 });
    await expect(message).toHaveText(responseData.message);
    
    const timestampElement = page.getByTestId('timestamp');
    await expect(timestampElement).toBeVisible();
    await expect(timestampElement).toContainText(`Last updated: ${expectedTimestamp}`);
  });

  test('should not show loading spinner after data loads', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('hello-message').waitFor({ state: 'visible' });
    await expect(page.locator('.spinner-border')).not.toBeVisible();
  });

  test('should use Bootstrap card styling', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.card')).toBeVisible();
    await expect(page.locator('.card-body')).toBeVisible();
  });
});
