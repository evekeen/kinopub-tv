import { create } from 'zustand';
import type { TokenResponse } from '../types';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from '../api/client';
import { refreshToken as refreshTokenApi } from '../api/auth';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (tokens: TokenResponse) => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

let refreshPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>()((set, get) => ({
  accessToken: getAccessToken(),
  refreshToken: getRefreshToken(),
  isAuthenticated: getAccessToken() !== null,

  login(tokens: TokenResponse): void {
    setTokens(tokens.access_token, tokens.refresh_token);
    set({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      isAuthenticated: true,
    });
  },

  logout(): void {
    clearTokens();
    set({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  refresh(): Promise<void> {
    if (refreshPromise) return refreshPromise;

    refreshPromise = executeStoreRefresh(get, set).finally(() => {
      refreshPromise = null;
    });

    return refreshPromise;
  },
}));

async function executeStoreRefresh(
  get: () => AuthState,
  set: (partial: Partial<AuthState>) => void,
): Promise<void> {
  const currentRefreshToken = get().refreshToken;
  if (!currentRefreshToken) {
    get().logout();
    return;
  }

  try {
    const tokens = await refreshTokenApi(currentRefreshToken);
    setTokens(tokens.access_token, tokens.refresh_token);
    set({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      isAuthenticated: true,
    });
  } catch (error) {
    get().logout();
    throw error;
  }
}
