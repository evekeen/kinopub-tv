import { create } from 'zustand';
import type { TokenResponse } from '../types';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from '../api/client';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (tokens: TokenResponse) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
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
}));
