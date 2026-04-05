import type { DeviceCodeResponse, TokenResponse } from '../types';

const AUTH_BASE = 'https://api.service-kp.com/oauth2';
const CLIENT_ID = 'xbmc';
const CLIENT_SECRET = 'cgg3gtifu46urtfp2zp1nqtba0k2ezxh';

export class AuthRequestError extends Error {
  public readonly errorCode: string;
  public readonly errorDescription: string | undefined;

  constructor(errorCode: string, errorDescription?: string) {
    super(errorDescription ?? errorCode);
    this.name = 'AuthRequestError';
    this.errorCode = errorCode;
    this.errorDescription = errorDescription;
  }
}

function isErrorResponse(data: unknown): data is { error: string; error_description?: string } {
  if (typeof data !== 'object' || data === null) return false;
  if (!('error' in data)) return false;
  return typeof data.error === 'string';
}

async function authPost(path: string, params: Record<string, string>): Promise<unknown> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    ...params,
  });

  const response = await fetch(`${AUTH_BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data: unknown = await response.json();

  if (isErrorResponse(data)) {
    throw new AuthRequestError(data.error, data.error_description);
  }

  return data;
}

function isDeviceCodeResponse(data: unknown): data is DeviceCodeResponse {
  if (typeof data !== 'object' || data === null) return false;
  return (
    'code' in data && typeof data.code === 'string' &&
    'user_code' in data && typeof data.user_code === 'string' &&
    'verification_uri' in data && typeof data.verification_uri === 'string' &&
    'expires_in' in data && typeof data.expires_in === 'number' &&
    'interval' in data && typeof data.interval === 'number'
  );
}

function isTokenResponse(data: unknown): data is TokenResponse {
  if (typeof data !== 'object' || data === null) return false;
  return (
    'access_token' in data && typeof data.access_token === 'string' &&
    'refresh_token' in data && typeof data.refresh_token === 'string' &&
    'expires_in' in data && typeof data.expires_in === 'number'
  );
}

export async function getDeviceCode(): Promise<DeviceCodeResponse> {
  const data = await authPost('device', { grant_type: 'device_code' });
  if (!isDeviceCodeResponse(data)) {
    throw new AuthRequestError('invalid_response', 'Unexpected device code response shape');
  }
  return data;
}

export async function pollForToken(code: string): Promise<TokenResponse> {
  const data = await authPost('device', { grant_type: 'device_token', code });
  if (isDeviceCodeResponse(data)) {
    throw new AuthRequestError('authorization_pending', 'Waiting for user activation');
  }
  if (!isTokenResponse(data)) {
    throw new AuthRequestError('invalid_response', 'Unexpected token response shape');
  }
  return data;
}

export async function refreshToken(token: string): Promise<TokenResponse> {
  const data = await authPost('token', { grant_type: 'refresh_token', refresh_token: token });
  if (!isTokenResponse(data)) {
    throw new AuthRequestError('invalid_response', 'Unexpected token response shape');
  }
  return data;
}
