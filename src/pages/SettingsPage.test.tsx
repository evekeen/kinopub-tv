import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import { SettingsPage } from './SettingsPage';
import { useUiStore } from '../store/ui';
import { useAuthStore } from '../store/auth';

const localStorageData: Record<string, string> = {};

vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string): string | null => localStorageData[key] ?? null),
  setItem: vi.fn((key: string, value: string): void => {
    localStorageData[key] = value;
  }),
  removeItem: vi.fn((key: string): void => {
    delete localStorageData[key];
  }),
  clear: vi.fn((): void => {
    Object.keys(localStorageData).forEach((k) => delete localStorageData[k]);
  }),
});

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    init({ debug: false, visualDebug: false });
    Object.keys(localStorageData).forEach((k) => delete localStorageData[k]);
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'test-token' });
    useUiStore.setState({
      currentScreen: 'settings',
      screenParams: {},
      navigationStack: [{ screen: 'home', params: {}, lastFocusKey: null }],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders settings page title', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Settings')).toBeDefined();
  });

  it('renders logout button', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Logout')).toBeDefined();
  });

  it('renders about section', () => {
    render(<SettingsPage />);
    expect(screen.getByText('KinoPub Tizen v1.0.0')).toBeDefined();
    expect(screen.getByText('hls.js player for Samsung Smart TVs')).toBeDefined();
  });

  it('renders account section title', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Account')).toBeDefined();
  });

  it('logout clears auth state and resets navigation', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
    });
    useUiStore.setState({
      currentScreen: 'settings',
      navigationStack: [{ screen: 'home', params: {}, lastFocusKey: null }],
    });

    render(<SettingsPage />);
    expect(screen.getByText('Logout')).toBeDefined();

    useAuthStore.getState().logout();
    useUiStore.getState().clearStack();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useUiStore.getState().currentScreen).toBe('auth');
    expect(useUiStore.getState().navigationStack).toHaveLength(0);
  });

  it('handles back key by calling goBack', () => {
    const goBackSpy = vi.fn();
    useUiStore.setState({ goBack: goBackSpy });

    render(<SettingsPage />);

    fireEvent.keyDown(window, { key: 'Backspace', keyCode: 8 });

    expect(goBackSpy).toHaveBeenCalled();
  });
});
