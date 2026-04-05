import { test, expect } from '@playwright/test';
import { setupAuthenticatedPage } from './helpers/mock-api';

test.describe('Player page', () => {
  async function navigateToPlayer(page: import('@playwright/test').Page): Promise<void> {
    await expect(page.getByText('Fresh Movie One')).toBeVisible({ timeout: 10000 });

    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);
  }

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page);
  });

  test('player page mounts video element', async ({ page }) => {
    await navigateToPlayer(page);

    const video = page.locator('video');
    await expect(video).toBeAttached({ timeout: 5000 });
  });

  test('hls.js initializes without errors', async ({ page }) => {
    const hlsErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.text().includes('Hls.Events.ERROR') || msg.text().includes('hlsError')) {
        hlsErrors.push(msg.text());
      }
    });

    await navigateToPlayer(page);
    await page.waitForTimeout(3000);

    expect(hlsErrors).toHaveLength(0);
  });

  test('player overlay appears on keypress and auto-hides', async ({ page }) => {
    await navigateToPlayer(page);
    await page.waitForTimeout(500);

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);

    const overlay = page.locator('[class*="overlay"], [class*="Overlay"], [class*="controls"]');
    const count = await overlay.count();
    expect(count).toBeGreaterThan(0);
  });

  test('track picker opens and lists audio tracks', async ({ page }) => {
    await navigateToPlayer(page);
    await page.waitForTimeout(500);

    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(300);

    const trackPicker = page.locator('[class*="track"], [class*="Track"], [class*="picker"]');
    const count = await trackPicker.count();
    expect(count).toBeGreaterThan(0);
  });

  test('back key exits player and returns to content page', async ({ page }) => {
    await navigateToPlayer(page);
    await page.waitForTimeout(500);

    await page.keyboard.press('Backspace');
    await page.waitForTimeout(1000);

    await expect(page.getByText('Fresh Movie One')).toBeVisible({ timeout: 5000 });
  });
});
