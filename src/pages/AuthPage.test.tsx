import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { AuthPage } from './AuthPage';
import { useAuthStore } from '../store/auth';
import { useUiStore } from '../store/ui';
import type { DeviceCodeResponse, TokenResponse } from '../types';

const mockGetDeviceCode = vi.fn<() => Promise<DeviceCodeResponse>>();
const mockPollForToken = vi.fn<(code: string) => Promise<TokenResponse>>();

vi.mock('../api/auth', async () => {
  class AuthRequestError extends Error {
    public readonly errorCode: string;
    public readonly errorDescription: string | undefined;
    constructor(errorCode: string, errorDescription?: string) {
      super(errorDescription ?? errorCode);
      this.name = 'AuthRequestError';
      this.errorCode = errorCode;
      this.errorDescription = errorDescription;
    }
  }

  return {
    getDeviceCode: () => mockGetDeviceCode(),
    pollForToken: (code: string) => mockPollForToken(code),
    AuthRequestError,
  };
});

const DEVICE_CODE_RESPONSE: DeviceCodeResponse = {
  code: 'test-device-code',
  user_code: 'ABCD1234',
  verification_uri: 'https://kino.pub/device',
  expires_in: 600,
  interval: 5,
};

async function createAuthRequestError(errorCode: string): Promise<Error> {
  const mod = await import('../api/auth');
  return new mod.AuthRequestError(errorCode);
}

describe('AuthPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useAuthStore.setState({
      isAuthenticated: false,
    });
    useUiStore.setState({
      currentScreen: 'auth',
      screenParams: {},
      navigationStack: [],
    });
    mockGetDeviceCode.mockReset();
    mockPollForToken.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows spinner while loading device code', () => {
    mockGetDeviceCode.mockReturnValue(new Promise(() => {}));
    render(<AuthPage />);
    const spinner = document.querySelector('[class*="spinner"]');
    expect(spinner).not.toBeNull();
  });

  it('displays device code and verification URI', async () => {
    mockGetDeviceCode.mockResolvedValue(DEVICE_CODE_RESPONSE);

    await act(async () => {
      render(<AuthPage />);
    });

    expect(screen.getByText('ABCD1234')).toBeDefined();
    expect(screen.getByText('https://kino.pub/device')).toBeDefined();
    expect(screen.getByText('Waiting for activation...')).toBeDefined();
  });

  it('polls for token and logs in on success', async () => {
    const pendingError = await createAuthRequestError('authorization_pending');
    mockGetDeviceCode.mockResolvedValue(DEVICE_CODE_RESPONSE);
    mockPollForToken.mockRejectedValueOnce(pendingError);
    mockPollForToken.mockResolvedValueOnce({
      access_token: 'access-123',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'refresh-456',
    });

    await act(async () => {
      render(<AuthPage />);
    });

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockPollForToken).toHaveBeenCalledWith('test-device-code');

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useUiStore.getState().currentScreen).toBe('home');
  });

  it('shows error and retries on Enter', async () => {
    mockGetDeviceCode.mockRejectedValueOnce(new Error('Network failure'));
    mockGetDeviceCode.mockResolvedValueOnce(DEVICE_CODE_RESPONSE);

    await act(async () => {
      render(<AuthPage />);
    });

    expect(screen.getByText('Authentication Error')).toBeDefined();
    expect(screen.getByText('Network failure')).toBeDefined();

    await act(async () => {
      fireEvent.keyDown(window, { key: 'Enter' });
    });

    expect(screen.getByText('ABCD1234')).toBeDefined();
  });

  it('ignores authorization_pending errors during polling', async () => {
    const pendingError = await createAuthRequestError('authorization_pending');
    mockGetDeviceCode.mockResolvedValue(DEVICE_CODE_RESPONSE);
    mockPollForToken.mockRejectedValue(pendingError);

    await act(async () => {
      render(<AuthPage />);
    });

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText('Waiting for activation...')).toBeDefined();
  });
});
