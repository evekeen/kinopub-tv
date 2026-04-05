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

async function authPost<T>(path: string, params: Record<string, string>): Promise<T> {
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

  return data as T;
}

export async function getDeviceCode(): Promise<DeviceCodeResponse> {
  return authPost<DeviceCodeResponse>('device', {
    grant_type: 'device_code',
  });
}

export async function pollForToken(code: string): Promise<TokenResponse> {
  return authPost<TokenResponse>('device', {
    grant_type: 'device_code',
    code,
  });
}

export async function refreshToken(token: string): Promise<TokenResponse> {
  return authPost<TokenResponse>('token', {
    grant_type: 'refresh_token',
    refresh_token: token,
  });
}
