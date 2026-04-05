import { Page } from '@playwright/test';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(CURRENT_DIR, '..', 'fixtures');

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
}

export async function setupMockApi(page: Page): Promise<void> {
  const freshItems = loadFixture('items-fresh.json');
  const hotItems = loadFixture('items-hot.json');
  const searchResults = loadFixture('search-results.json');
  const movieDetail = loadFixture('item-detail-movie.json');
  const serialDetail = loadFixture('item-detail-serial.json');
  const mediaLinks = loadFixture('media-links.json');
  const bookmarksData = loadFixture('bookmarks.json');
  const historyData = loadFixture('history.json');

  await page.route('**/api.service-kp.com/oauth2/**', (route) => {
    const url = route.request().url();

    if (url.includes('/oauth2/device')) {
      const postData = route.request().postData() ?? '';
      if (postData.includes('code=')) {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'authorization_pending',
            error_description: 'The authorization request is still pending',
          }),
        });
        return;
      }

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'e2e-device-code',
          user_code: 'TESTCODE',
          verification_uri: 'https://kino.pub/device',
          expires_in: 600,
          interval: 5,
        }),
      });
      return;
    }

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 200 }),
    });
  });

  await page.route('**/api.service-kp.com/v1/**', (route) => {
    const url = route.request().url();

    if (url.includes('/items/fresh')) {
      route.fulfill({ status: 200, contentType: 'application/json', body: freshItems });
      return;
    }

    if (url.includes('/items/hot')) {
      route.fulfill({ status: 200, contentType: 'application/json', body: hotItems });
      return;
    }

    if (url.includes('/items/popular')) {
      route.fulfill({ status: 200, contentType: 'application/json', body: freshItems });
      return;
    }

    if (url.includes('/items/search')) {
      route.fulfill({ status: 200, contentType: 'application/json', body: searchResults });
      return;
    }

    if (url.includes('/items/media-links') || url.includes('/items/media')) {
      route.fulfill({ status: 200, contentType: 'application/json', body: mediaLinks });
      return;
    }

    if (url.includes('/items/2001')) {
      route.fulfill({ status: 200, contentType: 'application/json', body: serialDetail });
      return;
    }

    if (url.match(/\/items\/\d+/)) {
      route.fulfill({ status: 200, contentType: 'application/json', body: movieDetail });
      return;
    }

    if (url.includes('/bookmarks')) {
      route.fulfill({ status: 200, contentType: 'application/json', body: bookmarksData });
      return;
    }

    if (url.includes('/watching')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 200, items: [], pagination: { total: 0, current: 1, perpage: 20, total_items: 0 } }),
      });
      return;
    }

    if (url.includes('/history')) {
      route.fulfill({ status: 200, contentType: 'application/json', body: historyData });
      return;
    }

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 200, items: [] }),
    });
  });
}

export async function injectAuthTokens(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.setItem('kinopub_access_token', 'e2e-test-access-token');
    localStorage.setItem('kinopub_refresh_token', 'e2e-test-refresh-token');
  });
}

export async function setupAuthenticatedPage(page: Page): Promise<void> {
  await setupMockApi(page);
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kinopub_access_token', 'e2e-test-access-token');
    localStorage.setItem('kinopub_refresh_token', 'e2e-test-refresh-token');
  });
  await page.goto('/');
  await page.waitForTimeout(1500);
}
