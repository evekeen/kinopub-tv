import { Page, Route } from '@playwright/test';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(CURRENT_DIR, '..', 'fixtures');

const MAX_VALID_VIDEO_NUMBER = 50;

interface SerialEpisode {
  id: number;
  title: string;
  number: number;
  snumber: number;
  thumbnail: string;
  duration: number;
  watched: number;
  watching: { status: number; time: number };
  tracks: number;
  ac3: number;
  audios: ReadonlyArray<unknown>;
  subtitles: ReadonlyArray<unknown>;
}

interface SerialSeason {
  id: number;
  number: number;
  title: string;
  watched: number;
  watching: { status: number; time: number };
  episodes: SerialEpisode[];
}

interface PostersFixture {
  small: string;
  medium: string;
  big: string;
  wide?: string;
}

interface SerialItem {
  id: number;
  type: string;
  title: string;
  subtype: string | null;
  posters: PostersFixture;
  seasons: SerialSeason[];
  [key: string]: unknown;
}

interface SerialDetailResponse {
  status: number;
  item: SerialItem;
}

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
}

function watchedKey(itemId: number, seasonNumber: number, videoNumber: number): string {
  return itemId + ':' + seasonNumber + ':' + videoNumber;
}

function parseQueryParams(url: string): URLSearchParams {
  const queryStart = url.indexOf('?');
  if (queryStart === -1) return new URLSearchParams();
  return new URLSearchParams(url.slice(queryStart + 1));
}

function parseVideoNumber(params: URLSearchParams): number | null {
  const raw = params.get('video');
  if (raw === null) return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) return null;
  return parsed;
}

function parseItemId(params: URLSearchParams): number | null {
  const raw = params.get('id');
  if (raw === null) return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) return null;
  return parsed;
}

function parseSeasonNumber(params: URLSearchParams): number {
  const raw = params.get('season');
  if (raw === null) return 0;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) return 0;
  return parsed;
}

function applyWatchedMap(serial: SerialDetailResponse, watchedMap: Map<string, 0 | 1>): SerialDetailResponse {
  const item = serial.item;
  const updatedSeasons: SerialSeason[] = item.seasons.map((season) => {
    const updatedEpisodes: SerialEpisode[] = season.episodes.map((episode) => {
      const key = watchedKey(item.id, episode.snumber, episode.number);
      const status = watchedMap.get(key);
      if (status === 1) {
        return { ...episode, watched: 1 };
      }
      return episode;
    });
    return { ...season, episodes: updatedEpisodes };
  });
  return {
    ...serial,
    item: { ...item, seasons: updatedSeasons },
  };
}

interface MockApiHandle {
  watchedMap: Map<string, 0 | 1>;
  seedWatched: (itemId: number, seasonNumber: number, videoNumber: number) => void;
}

export async function setupMockApi(page: Page): Promise<MockApiHandle> {
  const freshItems = loadFixture('items-fresh.json');
  const hotItems = loadFixture('items-hot.json');
  const searchResults = loadFixture('search-results.json');
  const movieDetail = loadFixture('item-detail-movie.json');
  const serialDetailRaw = loadFixture('item-detail-serial.json');
  const mediaLinks = loadFixture('media-links.json');
  const bookmarksData = loadFixture('bookmarks.json');
  const historyData = loadFixture('history.json');

  const watchedMap = new Map<string, 0 | 1>();

  const seedWatched = (itemId: number, seasonNumber: number, videoNumber: number): void => {
    watchedMap.set(watchedKey(itemId, seasonNumber, videoNumber), 1);
  };

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

  const handleWatchingToggle = (route: Route, url: string): void => {
    const params = parseQueryParams(url);
    const itemId = parseItemId(params);
    const videoNumber = parseVideoNumber(params);
    if (itemId === null || videoNumber === null || videoNumber > MAX_VALID_VIDEO_NUMBER) {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ status: 404, error: 'Invalid video number' }),
      });
      return;
    }
    const seasonNumber = parseSeasonNumber(params);
    const statusRaw = params.get('status');
    const explicit = statusRaw === '1' || statusRaw === '0' ? (Number(statusRaw) as 0 | 1) : null;
    const key = watchedKey(itemId, seasonNumber, videoNumber);
    const next: 0 | 1 = explicit !== null ? explicit : watchedMap.get(key) === 1 ? 0 : 1;
    watchedMap.set(key, next);
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 200, watched: next }),
    });
  };

  const handleWatchingMarkTime = (route: Route, url: string): void => {
    const params = parseQueryParams(url);
    const itemId = parseItemId(params);
    const videoNumber = parseVideoNumber(params);
    if (itemId === null || videoNumber === null || videoNumber > MAX_VALID_VIDEO_NUMBER) {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ status: 404, error: 'Invalid video number' }),
      });
      return;
    }
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 200 }),
    });
  };

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
      const parsed: SerialDetailResponse = JSON.parse(serialDetailRaw);
      const withWatched = applyWatchedMap(parsed, watchedMap);
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(withWatched),
      });
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

    if (url.includes('/watching/toggle')) {
      handleWatchingToggle(route, url);
      return;
    }

    if (url.includes('/watching/marktime')) {
      handleWatchingMarkTime(route, url);
      return;
    }

    if (url.includes('/watching/serials')) {
      const parsedSerial: SerialDetailResponse = JSON.parse(serialDetailRaw);
      const item = parsedSerial.item;
      const totalEpisodes = item.seasons.reduce((sum, s) => sum + s.episodes.length, 0);
      const watchedEpisodes = item.seasons.reduce((sum, s) => {
        return sum + s.episodes.filter((e) => watchedMap.get(watchedKey(item.id, e.snumber, e.number)) === 1).length;
      }, 0);
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 200,
          items: [
            {
              id: item.id,
              type: item.type,
              title: item.title,
              subtype: item.subtype,
              posters: item.posters,
              new: 0,
              total: totalEpisodes,
              watched: watchedEpisodes,
            },
          ],
          pagination: { total: 1, current: 1, perpage: 20, total_items: 1 },
        }),
      });
      return;
    }

    if (url.includes('/watching/movies')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 200, items: [], pagination: { total: 0, current: 1, perpage: 20, total_items: 0 } }),
      });
      return;
    }

    if (url.includes('/watching')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 200 }),
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

  return { watchedMap, seedWatched };
}

export async function injectAuthTokens(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.setItem('kinopub_access_token', 'e2e-test-access-token');
    localStorage.setItem('kinopub_refresh_token', 'e2e-test-refresh-token');
  });
}

export async function setupAuthenticatedPage(page: Page): Promise<MockApiHandle> {
  const handle = await setupMockApi(page);
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kinopub_access_token', 'e2e-test-access-token');
    localStorage.setItem('kinopub_refresh_token', 'e2e-test-refresh-token');
  });
  await page.goto('/');
  await page.waitForTimeout(1500);
  return handle;
}

export type { MockApiHandle };
