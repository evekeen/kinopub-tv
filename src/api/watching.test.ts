import { describe, it, expect, vi, beforeEach } from 'vitest';
import { markTime, toggleWatched } from './watching';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const storage = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
});

function jsonResponse(status: number, body: unknown): Partial<Response> {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  };
}

describe('watching API client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.clear();
    storage.set('kinopub_access_token', 'stub-token');
    storage.set('kinopub_refresh_token', 'stub-refresh');
  });

  describe('markTime', () => {
    it('sends 1-based video number, season, time, and id for a serial episode', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(200, { status: 200 }));

      await markTime(42, 3, 1234, 2);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.service-kp.com/v1/watching/marktime?id=42&video=3&time=1234&season=2',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('omits season for movies and uses video=1', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(200, { status: 200 }));

      await markTime(42, 1, 600);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toBe('https://api.service-kp.com/v1/watching/marktime?id=42&video=1&time=600');
      expect(calledUrl).not.toContain('season=');
    });
  });

  describe('toggleWatched', () => {
    it('sends explicit status=1 for an auto-mark from the player', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(200, { status: 200 }));

      await toggleWatched(42, 3, 2, 1);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.service-kp.com/v1/watching/toggle?id=42&video=3&season=2&status=1',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('omits season and status for a movie flip-mode toggle', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(200, { status: 200 }));

      await toggleWatched(42, 1);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toBe('https://api.service-kp.com/v1/watching/toggle?id=42&video=1');
      expect(calledUrl).not.toContain('season=');
      expect(calledUrl).not.toContain('status=');
    });
  });

  describe('authorization', () => {
    it('attaches the bearer access token from localStorage', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(200, { status: 200 }));

      await markTime(42, 1, 600);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer stub-token',
          }),
        }),
      );
    });
  });
});
