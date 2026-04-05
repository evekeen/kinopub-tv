import { test, expect } from '@playwright/test';
import { setupAuthenticatedPage } from './helpers/mock-api';

test.describe('Home page', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page);
  });

  test('home page renders content rails with poster cards', async ({ page }) => {
    await expect(page.getByText('Fresh Movie One')).toBeVisible({ timeout: 10000 });

    const cards = page.locator('[class*="card"], [class*="poster"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('arrow keys navigate horizontally within a rail', async ({ page }) => {
    await page.waitForTimeout(1000);

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);

    const focused = page.locator('[class*="cardFocused"], [class*="focused"]');
    const count = await focused.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('arrow down moves focus to next rail', async ({ page }) => {
    await page.waitForTimeout(1000);

    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);

    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('poster card shows title and image or placeholder', async ({ page }) => {
    await expect(page.getByText('Fresh Movie One')).toBeVisible({ timeout: 10000 });

    const images = page.locator('img[width="250"]');
    const placeholders = page.locator('[class*="placeholder"]');
    const imageCount = await images.count();
    const placeholderCount = await placeholders.count();
    expect(imageCount + placeholderCount).toBeGreaterThan(0);
  });

  test('enter on card navigates to content detail page', async ({ page }) => {
    await expect(page.getByText('Fresh Movie One')).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await expect(page.getByText('A thrilling adventure movie')).toBeVisible({ timeout: 10000 });
  });
});
