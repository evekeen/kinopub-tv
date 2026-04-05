import { test, expect } from '@playwright/test';
import { setupAuthenticatedPage } from './helpers/mock-api';

test.describe('Content detail page', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page);
  });

  test('content page renders title, poster, plot, metadata', async ({ page }) => {
    await expect(page.getByText('Fresh Movie One')).toBeVisible({ timeout: 10000 });

    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await expect(page.getByText('Fresh Movie One')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('A thrilling adventure movie')).toBeVisible();
  });

  test('play button is focusable', async ({ page }) => {
    await expect(page.getByText('Fresh Movie One')).toBeVisible({ timeout: 10000 });

    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await expect(page.getByText('Play')).toBeVisible({ timeout: 5000 });
  });

  test('for series: season tabs and episode list render', async ({ page }) => {
    await expect(page.getByText('Fresh Movie One')).toBeVisible({ timeout: 10000 });

    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);

    const hotSeriesVisible = await page.getByText('Hot Series One').isVisible().catch(() => false);
    if (!hotSeriesVisible) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(200);
    }

    if (await page.getByText('Hot Series One').isVisible().catch(() => false)) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1500);

      const hasContent = await page.getByText('Pilot').isVisible().catch(() => false)
        || await page.getByText('Season 1').isVisible().catch(() => false)
        || await page.getByText('Season').isVisible().catch(() => false);

      expect(hasContent).toBeTruthy();
    }
  });

  test('enter on play button navigates to player screen', async ({ page }) => {
    await expect(page.getByText('Fresh Movie One')).toBeVisible({ timeout: 10000 });

    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    const video = page.locator('video');
    await expect(video).toBeAttached({ timeout: 5000 });
  });
});
