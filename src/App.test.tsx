import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from './App';
import { useAuthStore } from './store/auth';
import { useUiStore } from './store/ui';

vi.mock('./api/auth', () => {
  class AuthRequestError extends Error {
    public readonly errorCode: string;
    constructor(errorCode: string) {
      super(errorCode);
      this.errorCode = errorCode;
    }
  }

  return {
    getDeviceCode: vi.fn().mockResolvedValue({
      code: 'test-code',
      user_code: 'ABCD1234',
      verification_uri: 'https://kino.pub/device',
      expires_in: 600,
      interval: 5,
    }),
    pollForToken: vi.fn().mockRejectedValue(
      new AuthRequestError('authorization_pending'),
    ),
    refreshToken: vi.fn(),
    AuthRequestError,
  };
});

describe('App', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
    useUiStore.setState({
      currentScreen: 'auth',
      screenParams: {},
      navigationStack: [],
    });
  });

  it('shows auth page when not authenticated', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeDefined();
    });

    expect(screen.getByText('ABCD1234')).toBeDefined();
    expect(screen.getByText('https://kino.pub/device')).toBeDefined();
  });

  it('shows home placeholder when authenticated', async () => {
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'token' });
    useUiStore.setState({ currentScreen: 'home' });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Screen: home')).toBeDefined();
    });
  });
});
