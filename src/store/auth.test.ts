import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from './auth';

const storage = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
});

describe('auth store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.clear();
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  });

  it('starts unauthenticated when no tokens in storage', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });

  it('login stores tokens and sets authenticated', () => {
    useAuthStore.getState().login({
      access_token: 'access123',
      refresh_token: 'refresh456',
      token_type: 'bearer',
      expires_in: 3600,
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('access123');
    expect(state.refreshToken).toBe('refresh456');
    expect(storage.get('kinopub_access_token')).toBe('access123');
    expect(storage.get('kinopub_refresh_token')).toBe('refresh456');
  });

  it('logout clears tokens and sets unauthenticated', () => {
    useAuthStore.getState().login({
      access_token: 'access123',
      refresh_token: 'refresh456',
      token_type: 'bearer',
      expires_in: 3600,
    });

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(storage.has('kinopub_access_token')).toBe(false);
    expect(storage.has('kinopub_refresh_token')).toBe(false);
  });
});
