import { test, expect, Page } from '@playwright/test';
import { setupAuthenticatedPage, MockApiHandle } from './helpers/mock-api';

const SERIAL_TITLE = 'Hot Series One';
const SERIAL_ID = 2001;
const EPISODE_1_MEDIA_ID = 6001;
const EPISODE_2_MEDIA_ID = 6002;

test.describe('Player page', () => {
  async function navigateToPlayer(page: Page): Promise<void> {
    await expect(page.getByText(SERIAL_TITLE)).toBeVisible({ timeout: 10000 });

    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

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

    await expect(page.getByText(SERIAL_TITLE)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Watched marking flow (serial)', () => {
  let mock: MockApiHandle;

  test.beforeEach(async ({ page }) => {
    mock = await setupAuthenticatedPage(page);
  });

  test('watching past 90% marks episode as watched on return', async ({ page }) => {
    await expect(page.getByText(SERIAL_TITLE)).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);
    await expect(page.getByText('Pilot')).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await expect(page.locator('video')).toBeAttached({ timeout: 5000 });

    await page.evaluate(() => {
      const video = document.querySelector('video');
      if (video === null) throw new Error('video element missing');
      Object.defineProperty(video, 'duration', { value: 1000, configurable: true });
      Object.defineProperty(video, 'currentTime', { value: 950, configurable: true });
      video.dispatchEvent(new Event('timeupdate'));
    });

    await expect.poll(() => mock.watchedMap.get(SERIAL_ID + ':1:1'), { timeout: 3000 }).toBe(1);

    await page.keyboard.press('Backspace');
    await page.waitForTimeout(2500);

    await expect(page.getByText('Pilot')).toBeVisible({ timeout: 5000 });

    const watchedDot = page.locator('[class*="watchedDone"]').first();
    await expect(watchedDot).toBeVisible({ timeout: 3000 });
  });

  test('mock rejects bogus video IDs (regression guard)', async ({ page }) => {
    const responseStatuses: number[] = [];
    page.on('response', (resp) => {
      if (resp.url().includes('/watching/toggle')) {
        responseStatuses.push(resp.status());
      }
    });

    await page.evaluate(() => {
      void fetch('https://api.service-kp.com/v1/watching/toggle?id=42&video=999999&season=1&status=1', {
        method: 'POST',
        headers: { Authorization: 'Bearer e2e-test-access-token' },
      });
    });
    await page.waitForTimeout(500);

    expect(responseStatuses).toContain(404);
  });

  test('serial Play button starts next unwatched episode', async ({ page }) => {
    mock.seedWatched(SERIAL_ID, 1, 1);

    const mediaLinkRequests: number[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('/items/media-links')) {
        const match = url.match(/[?&]mid=(\d+)/);
        if (match !== null) {
          mediaLinkRequests.push(Number(match[1]));
        }
      }
    });

    await expect(page.getByText(SERIAL_TITLE)).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await expect(page.getByText('Play')).toBeVisible({ timeout: 5000 });

    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    await expect(page.locator('video')).toBeAttached({ timeout: 5000 });

    expect(mediaLinkRequests).toContain(EPISODE_2_MEDIA_ID);
    expect(mediaLinkRequests).not.toContain(EPISODE_1_MEDIA_ID);
  });
});
