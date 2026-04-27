import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./auth')>();
  return {
    ...actual,
    refreshToken: vi.fn(),
  };
});

import { refreshToken, AuthRequestError as AuthRequestErrorClass } from './auth';
import {
  apiGet,
  apiPost,
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  AuthRequiredError,
  SubscriptionRequiredError,
  ApiNetworkError,
  ServerError,
} from './client';

const mockRefreshToken = vi.mocked(refreshToken);

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

describe('client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.clear();
  });

  describe('token management', () => {
    it('stores and retrieves tokens', () => {
      setTokens('access123', 'refresh456');
      expect(getAccessToken()).toBe('access123');
      expect(getRefreshToken()).toBe('refresh456');
    });

    it('clears tokens', () => {
      setTokens('access123', 'refresh456');
      clearTokens();
      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
    });
  });

  describe('apiGet', () => {
    it('sends GET request with auth header', async () => {
      setTokens('test-token', 'refresh-token');
      mockFetch.mockResolvedValueOnce(jsonResponse(200, { status: 200, items: [] }));

      const result = await apiGet<{ status: number; items: unknown[] }>('items');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.service-kp.com/v1/items',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
      expect(result).toEqual({ status: 200, items: [] });
    });

    it('appends query parameters', async () => {
      setTokens('test-token', 'refresh-token');
      mockFetch.mockResolvedValueOnce(jsonResponse(200, { status: 200 }));

      await apiGet('items', { type: 'movie', page: 1 });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('type=movie');
      expect(calledUrl).toContain('page=1');
    });

    it('skips undefined params', async () => {
      setTokens('test-token', 'refresh-token');
      mockFetch.mockResolvedValueOnce(jsonResponse(200, { status: 200 }));

      await apiGet('items', { type: 'movie', genre: undefined });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('type=movie');
      expect(calledUrl).not.toContain('genre');
    });

    it('throws AuthRequiredError when no token', async () => {
      await expect(apiGet('items')).rejects.toThrow(AuthRequiredError);
    });

    it('refreshes token on 401 and retries', async () => {
      setTokens('old-token', 'refresh-token');
      mockFetch
        .mockResolvedValueOnce(jsonResponse(401, {}))
        .mockResolvedValueOnce(jsonResponse(200, { status: 200, items: ['data'] }));

      mockRefreshToken.mockResolvedValueOnce({
        access_token: 'new-token',
        refresh_token: 'new-refresh',
        token_type: 'bearer',
        expires_in: 3600,
      });

      const result = await apiGet<{ status: number; items: string[] }>('items');

      expect(mockRefreshToken).toHaveBeenCalledWith('refresh-token');
      expect(result.items).toEqual(['data']);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('shares refresh promise for concurrent 401s', async () => {
      setTokens('old-token', 'refresh-token');

      mockFetch
        .mockResolvedValueOnce(jsonResponse(401, {}))
        .mockResolvedValueOnce(jsonResponse(401, {}))
        .mockResolvedValueOnce(jsonResponse(200, { result: 'a' }))
        .mockResolvedValueOnce(jsonResponse(200, { result: 'b' }));

      mockRefreshToken.mockResolvedValueOnce({
        access_token: 'new-token',
        refresh_token: 'new-refresh',
        token_type: 'bearer',
        expires_in: 3600,
      });

      const [resultA, resultB] = await Promise.all([
        apiGet<{ result: string }>('a'),
        apiGet<{ result: string }>('b'),
      ]);

      expect(mockRefreshToken).toHaveBeenCalledTimes(1);
      expect(resultA.result).toBe('a');
      expect(resultB.result).toBe('b');
    });

    it('throws SubscriptionRequiredError on 403', async () => {
      setTokens('test-token', 'refresh-token');
      mockFetch.mockResolvedValueOnce(jsonResponse(403, {}));

      await expect(apiGet('items')).rejects.toThrow(SubscriptionRequiredError);
    });

    it('throws ServerError on 500', async () => {
      setTokens('test-token', 'refresh-token');
      mockFetch.mockResolvedValueOnce(jsonResponse(500, {}));

      await expect(apiGet('items')).rejects.toThrow(ServerError);
    });

    it('retries on network failure', async () => {
      vi.useFakeTimers();
      setTokens('test-token', 'refresh-token');
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      const promise = apiGet('items');
      const resultPromise = promise.catch((e: Error) => e);

      await vi.runAllTimersAsync();

      const error = await resultPromise;
      expect(error).toBeInstanceOf(ApiNetworkError);
      expect(mockFetch).toHaveBeenCalledTimes(4);
      vi.useRealTimers();
    });

    it('throws AuthRequiredError and clears tokens when refresh returns auth error', async () => {
      setTokens('old-token', 'refresh-token');
      mockFetch.mockResolvedValueOnce(jsonResponse(401, {}));
      mockRefreshToken.mockRejectedValueOnce(new AuthRequestErrorClass('invalid_grant'));

      await expect(apiGet('items')).rejects.toThrow(AuthRequiredError);
      expect(getAccessToken()).toBeNull();
    });

    it('throws ApiNetworkError and preserves tokens when refresh has network error', async () => {
      setTokens('old-token', 'refresh-token');
      mockFetch.mockResolvedValueOnce(jsonResponse(401, {}));
      mockRefreshToken.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(apiGet('items')).rejects.toThrow(ApiNetworkError);
      expect(getAccessToken()).toBe('old-token');
      expect(getRefreshToken()).toBe('refresh-token');
    });
  });

  describe('apiPost', () => {
    it('sends POST request with params in query string and bearer auth', async () => {
      setTokens('test-token', 'refresh-token');
      mockFetch.mockResolvedValueOnce(jsonResponse(200, { status: 200 }));

      await apiPost('watching/marktime', { id: 1, video: 2, time: 100 });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.service-kp.com/v1/watching/marktime?id=1&video=2&time=100',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
    });

    it('skips undefined params from query string', async () => {
      setTokens('test-token', 'refresh-token');
      mockFetch.mockResolvedValueOnce(jsonResponse(200, { status: 200 }));

      await apiPost('test', { key: 'value', empty: undefined });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('key=value');
      expect(calledUrl).not.toContain('empty');
    });
  });
});
