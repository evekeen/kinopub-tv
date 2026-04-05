import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from './auth';

vi.mock('../api/auth', () => ({
  refreshToken: vi.fn(),
}));

import { refreshToken } from '../api/auth';

const mockRefreshToken = vi.mocked(refreshToken);

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

  it('refresh updates tokens on success', async () => {
    useAuthStore.getState().login({
      access_token: 'old-access',
      refresh_token: 'old-refresh',
      token_type: 'bearer',
      expires_in: 3600,
    });

    mockRefreshToken.mockResolvedValueOnce({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      token_type: 'bearer',
      expires_in: 3600,
    });

    await useAuthStore.getState().refresh();

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('new-access');
    expect(state.refreshToken).toBe('new-refresh');
    expect(state.isAuthenticated).toBe(true);
    expect(mockRefreshToken).toHaveBeenCalledWith('old-refresh');
  });

  it('refresh logs out when no refresh token available', async () => {
    useAuthStore.setState({
      accessToken: 'access',
      refreshToken: null,
      isAuthenticated: true,
    });

    await useAuthStore.getState().refresh();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(mockRefreshToken).not.toHaveBeenCalled();
  });

  it('refresh logs out and rethrows when token refresh fails', async () => {
    useAuthStore.getState().login({
      access_token: 'access',
      refresh_token: 'refresh',
      token_type: 'bearer',
      expires_in: 3600,
    });

    mockRefreshToken.mockRejectedValueOnce(new Error('network failure'));

    await expect(useAuthStore.getState().refresh()).rejects.toThrow('network failure');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });

  it('refresh shares promise for concurrent calls', async () => {
    useAuthStore.getState().login({
      access_token: 'old-access',
      refresh_token: 'old-refresh',
      token_type: 'bearer',
      expires_in: 3600,
    });

    mockRefreshToken.mockResolvedValueOnce({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      token_type: 'bearer',
      expires_in: 3600,
    });

    const store = useAuthStore.getState();
    await Promise.all([store.refresh(), store.refresh()]);

    expect(mockRefreshToken).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().accessToken).toBe('new-access');
  });
});
