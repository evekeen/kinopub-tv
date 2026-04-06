import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDeviceCode, pollForToken, refreshToken, AuthRequestError } from './auth';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function jsonResponse(status: number, body: unknown): Partial<Response> {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  };
}

describe('auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDeviceCode', () => {
    it('requests device code with correct params', async () => {
      const mockResponse = {
        code: 'abc123',
        user_code: 'ABCD-EFGH',
        verification_uri: 'https://kino.pub/device',
        expires_in: 600,
        interval: 5,
      };
      mockFetch.mockResolvedValueOnce(jsonResponse(200, mockResponse));

      const result = await getDeviceCode();

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.service-kp.com/oauth2/device',
        expect.objectContaining({ method: 'POST' }),
      );

      const calledInit = mockFetch.mock.calls[0][1] as RequestInit;
      const body = new URLSearchParams(calledInit.body as string);
      expect(body.get('grant_type')).toBe('device_code');
      expect(body.get('client_id')).toBe('xbmc');
      expect(body.get('client_secret')).toBe('cgg3gtifu46urtfp2zp1nqtba0k2ezxh');
    });
  });

  describe('pollForToken', () => {
    it('sends code and returns token on success', async () => {
      const mockResponse = {
        access_token: 'access123',
        refresh_token: 'refresh456',
        token_type: 'bearer',
        expires_in: 3600,
      };
      mockFetch.mockResolvedValueOnce(jsonResponse(200, mockResponse));

      const result = await pollForToken('abc123');

      expect(result).toEqual(mockResponse);
      const calledInit = mockFetch.mock.calls[0][1] as RequestInit;
      const body = new URLSearchParams(calledInit.body as string);
      expect(body.get('code')).toBe('abc123');
      expect(body.get('grant_type')).toBe('device_token');
    });

    it('throws AuthRequestError on authorization_pending', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(400, {
        error: 'authorization_pending',
        error_description: 'Waiting for user authorization',
      }));

      try {
        await pollForToken('abc123');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthRequestError);
        if (error instanceof AuthRequestError) {
          expect(error.errorCode).toBe('authorization_pending');
        }
      }
    });

    it('throws AuthRequestError on expired code', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(400, {
        error: 'expired_token',
        error_description: 'Device code expired',
      }));

      await expect(pollForToken('abc123')).rejects.toThrow(AuthRequestError);
    });
  });

  describe('refreshToken', () => {
    it('sends refresh_token and returns new tokens', async () => {
      const mockResponse = {
        access_token: 'new_access',
        refresh_token: 'new_refresh',
        token_type: 'bearer',
        expires_in: 3600,
      };
      mockFetch.mockResolvedValueOnce(jsonResponse(200, mockResponse));

      const result = await refreshToken('old_refresh');

      expect(result).toEqual(mockResponse);
      const calledInit = mockFetch.mock.calls[0][1] as RequestInit;
      const body = new URLSearchParams(calledInit.body as string);
      expect(body.get('grant_type')).toBe('refresh_token');
      expect(body.get('refresh_token')).toBe('old_refresh');
    });

    it('throws AuthRequestError on invalid refresh token', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(400, {
        error: 'invalid_grant',
        error_description: 'Refresh token is invalid',
      }));

      await expect(refreshToken('bad_token')).rejects.toThrow(AuthRequestError);
    });
  });
});
