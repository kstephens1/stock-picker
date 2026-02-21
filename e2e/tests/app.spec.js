// @ts-check
const { test, expect } = require('@playwright/test');

const ensureAuthenticated = async (page) => {
  if (await page.getByRole('heading', { name: 'Log On' }).isVisible()) {
    await page.getByLabel('Username').fill('keith');
    await page.getByLabel('Password').fill('ferret');
    await page.getByRole('button', { name: 'Log On' }).click();
  }

  await expect(page.getByRole('heading', { name: 'Strategies' })).toBeVisible();
};

test.describe('StockPicker App', () => {
  test('shows strategy tables on home page', async ({ page }) => {
    await page.goto('/');
    await ensureAuthenticated(page);
    await expect(page.locator('h1')).toHaveText('StockPicker');
    await expect(page.getByRole('button', { name: 'Add New Stock' }).first()).toBeVisible();
    await expect(page.locator('[data-testid^="strategy-average-row-"]').first()).toBeVisible();
  });

  test('performs strategy-scoped stock create, edit, and unlink', async ({ page }) => {
    const unique = Date.now().toString();
    const companyName = `Playwright Pharma ${unique}`;
    const updatedCompanyName = `Playwright Pharma Updated ${unique}`;

    await page.goto('/');
    await ensureAuthenticated(page);

    await page.getByRole('button', { name: 'Add New Stock' }).first().click();

    await page.getByLabel('Sector').fill('Healthcare');
    await page.getByLabel('Company').fill(companyName);
    await page.getByLabel('Ticker').fill('PWP');
    await page.getByTestId('stock-price-input').fill('9.91');
    await page.getByLabel('Buy Price').fill('9.75');
    await page.getByLabel('Buy Date').fill('2026-02-14');
    await page.getByLabel('Measure Price').fill('10.12');
    await page.getByLabel('Measure Date').fill('2026-02-15');
    await page.getByLabel('Change Percent').fill('2.12');
    await page.getByLabel('Criteria').fill('Momentum and upgrades');
    await page.getByRole('button', { name: 'Create Stock' }).click();

    await expect(page.getByRole('status').filter({ hasText: 'Created stock successfully.' })).toBeVisible();
    const createdRow = page.locator('tr', { hasText: companyName });
    await expect(createdRow).toBeVisible();
    await createdRow.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Company').fill(updatedCompanyName);
    await page.getByRole('button', { name: 'Update Stock' }).click();

    await expect(page.locator('tr', { hasText: updatedCompanyName })).toBeVisible();

    const updatedRow = page.locator('tr', { hasText: updatedCompanyName });
    await updatedRow.getByRole('button', { name: 'Delete' }).click();
    await expect(page.locator('tr', { hasText: updatedCompanyName })).toHaveCount(0);
  });

  test('performs strategy create, edit, and delete on subpage', async ({ page }) => {
    const unique = Date.now().toString();
    const strategyName = `Playwright strategy ${unique}`;
    const updatedStrategyName = `Playwright strategy updated ${unique}`;

    await page.goto('/');
    await ensureAuthenticated(page);
    await page.getByRole('link', { name: 'Manage Strategies' }).click();
    await expect(page).toHaveURL(/\/strategies/);

    await page.getByRole('button', { name: 'Create Strategy' }).click();
    await expect(page.getByText('Strategy text is required.')).toBeVisible();
    await expect(page.getByTestId('strategy-stock-checkbox-1')).toHaveCount(0);

    await page.getByLabel('Strategy').fill(strategyName);
    await page.getByRole('button', { name: 'Create Strategy' }).click();

    const strategyRow = page.locator('li', { hasText: strategyName });
    await expect(strategyRow).toBeVisible();
    await strategyRow.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Strategy').fill(updatedStrategyName);
    await page.getByRole('button', { name: 'Update Strategy' }).click();

    const updatedRow = page.locator('li', { hasText: updatedStrategyName });
    await expect(updatedRow).toBeVisible();
    await updatedRow.getByRole('button', { name: 'Delete' }).click();
    await expect(page.locator('li', { hasText: updatedStrategyName })).toHaveCount(0);
  });
});
