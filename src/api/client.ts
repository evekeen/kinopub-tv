import { refreshToken, AuthRequestError } from './auth';

const API_BASE = 'https://api.service-kp.com/v1';

const STORAGE_KEYS = {
  accessToken: 'kinopub_access_token',
  refreshToken: 'kinopub_refresh_token',
} as const;

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 10000;

export class ApiClientError extends Error {
  public readonly statusCode: number | undefined;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
  }
}

export class AuthRequiredError extends ApiClientError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
    this.name = 'AuthRequiredError';
  }
}

export class SubscriptionRequiredError extends ApiClientError {
  constructor(message: string = 'Subscription required') {
    super(message, 403);
    this.name = 'SubscriptionRequiredError';
  }
}

export class ApiNetworkError extends ApiClientError {
  constructor(message: string = 'Network request failed') {
    super(message);
    this.name = 'ApiNetworkError';
  }
}

export class ServerError extends ApiClientError {
  constructor(message: string = 'Server error', statusCode: number = 500) {
    super(message, statusCode);
    this.name = 'ServerError';
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.accessToken);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.refreshToken);
}

export function setTokens(accessToken: string, refreshTokenValue: string): void {
  localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
  localStorage.setItem(STORAGE_KEYS.refreshToken, refreshTokenValue);
}

export function clearTokens(): void {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
}

let refreshPromise: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = executeRefresh().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function executeRefresh(): Promise<string> {
  const storedRefreshToken = getRefreshToken();
  if (!storedRefreshToken) {
    clearTokens();
    throw new AuthRequiredError('No refresh token available');
  }

  try {
    const tokens = await refreshToken(storedRefreshToken);
    setTokens(tokens.access_token, tokens.refresh_token);
    return tokens.access_token;
  } catch (error) {
    if (error instanceof AuthRequestError) {
      clearTokens();
      throw new AuthRequiredError('Token refresh failed');
    }
    throw new ApiNetworkError(
      error instanceof Error ? error.message : 'Token refresh network error'
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = `${API_BASE}/${path}`;
  if (!params) return url;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}

interface ApiRequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

async function fetchWithRetry(url: string, init: ApiRequestInit): Promise<Response> {
  let lastError: ApiNetworkError = new ApiNetworkError();
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetch(url, init);
    } catch (error) {
      lastError = new ApiNetworkError(
        error instanceof Error ? error.message : 'Network request failed'
      );
      if (attempt < MAX_RETRIES) {
        const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS);
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

function classifyAndThrow(status: number): void {
  if (status === 401) {
    throw new AuthRequiredError();
  }
  if (status === 403) {
    throw new SubscriptionRequiredError();
  }
  if (status >= 500) {
    throw new ServerError(`Server error: ${status}`, status);
  }
  if (status >= 400) {
    throw new ApiClientError(`API error: ${status}`, status);
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  classifyAndThrow(response.status);
  const data: T = await response.json();
  return data;
}

async function apiRequest<T>(url: string, options: ApiRequestInit = {}): Promise<T> {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new AuthRequiredError();
  }

  const headers: Record<string, string> = {
    ...options.headers,
    Authorization: `Bearer ${accessToken}`,
  };

  const response = await fetchWithRetry(url, {
    method: options.method,
    headers,
    body: options.body,
  });

  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    const retryResponse = await fetchWithRetry(url, {
      method: options.method,
      headers: { ...options.headers, Authorization: `Bearer ${newToken}` },
      body: options.body,
    });
    return parseJsonResponse<T>(retryResponse);
  }

  return parseJsonResponse<T>(response);
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const url = buildUrl(path, params);
  return apiRequest<T>(url);
}

export async function apiPost<T>(
  path: string,
  body?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const url = `${API_BASE}/${path}`;

  const formBody = new URLSearchParams();
  if (body) {
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined) {
        formBody.set(key, String(value));
      }
    }
  }

  return apiRequest<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody.toString(),
  });
}
