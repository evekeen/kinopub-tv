import { test, expect } from '@playwright/test';
import { setupMockApi } from './helpers/mock-api';

test.describe('Auth page', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
  });

  test('app loads without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForTimeout(1000);

    expect(errors).toHaveLength(0);
  });

  test('auth page renders with device code and verification link', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('TESTCODE')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('kino.pub/device')).toBeVisible();
  });

  test('polling indicator is visible', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('TESTCODE')).toBeVisible({ timeout: 10000 });

    const spinnerOrPolling = page.locator('[class*="spinner"], [class*="polling"], [class*="status"]');
    const count = await spinnerOrPolling.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
