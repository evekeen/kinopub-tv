import { create } from 'zustand';
import type { TokenResponse } from '../types';
import {
  getAccessToken,
  setTokens,
  clearTokens,
} from '../api/client';

interface AuthState {
  isAuthenticated: boolean;
  login: (tokens: TokenResponse) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  isAuthenticated: getAccessToken() !== null,

  login(tokens: TokenResponse): void {
    setTokens(tokens.access_token, tokens.refresh_token);
    set({ isAuthenticated: true });
  },

  logout(): void {
    clearTokens();
    set({ isAuthenticated: false });
  },
}));
