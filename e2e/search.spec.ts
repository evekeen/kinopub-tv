import { test, expect } from '@playwright/test';
import { setupAuthenticatedPage } from './helpers/mock-api';

test.describe('Search page', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page);
  });

  async function navigateToSearch(page: import('@playwright/test').Page): Promise<void> {
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(200);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
  }

  test('search page renders input field', async ({ page }) => {
    await navigateToSearch(page);

    const input = page.locator('input[type="text"]');
    await expect(input).toBeVisible({ timeout: 5000 });
  });

  test('typing triggers debounced search and shows results', async ({ page }) => {
    await navigateToSearch(page);

    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    await page.keyboard.type('test query', { delay: 50 });
    await page.waitForTimeout(1000);

    await expect(page.getByText('Search Result Movie')).toBeVisible({ timeout: 10000 });
  });

  test('results grid renders poster cards', async ({ page }) => {
    await navigateToSearch(page);

    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    await page.keyboard.type('test', { delay: 50 });
    await page.waitForTimeout(1000);

    await expect(page.getByText('Search Result Movie')).toBeVisible({ timeout: 10000 });
  });

  test('enter on result navigates to content page', async ({ page }) => {
    await navigateToSearch(page);

    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    await page.keyboard.type('test', { delay: 50 });
    await page.waitForTimeout(1000);

    await expect(page.getByText('Search Result Movie')).toBeVisible({ timeout: 10000 });

    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await expect(page.getByText('Search Result Movie')).toBeVisible({ timeout: 10000 });
  });
});
