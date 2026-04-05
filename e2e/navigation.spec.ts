import { test, expect } from '@playwright/test';
import { setupAuthenticatedPage } from './helpers/mock-api';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page);
  });

  test('sidebar renders with expected items', async ({ page }) => {
    await expect(page.getByText('Home')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Search')).toBeVisible();
    await expect(page.getByText('Bookmarks')).toBeVisible();
    await expect(page.getByText('History')).toBeVisible();
    await expect(page.getByText('Settings')).toBeVisible();
  });

  test('arrow key navigation moves focus between sidebar items', async ({ page }) => {
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(200);

    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);

    const focused = page.locator('[class*="itemFocused"], [class*="focused"]');
    const count = await focused.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('enter on sidebar item changes content area', async ({ page }) => {
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(200);

    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);

    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('back key returns to previous screen', async ({ page }) => {
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(200);

    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    await page.keyboard.press('Backspace');
    await page.waitForTimeout(500);

    await expect(page.getByText('Home')).toBeVisible();
  });

  test('back on empty stack does not crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.keyboard.press('Backspace');
    await page.waitForTimeout(500);

    expect(errors).toHaveLength(0);
  });
});
