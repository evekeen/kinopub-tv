import { ReactElement, memo, useCallback, useEffect, useRef, useState } from 'react';
import { getDeviceCode, pollForToken, AuthRequestError } from '../api/auth';
import { useAuthStore } from '../store/auth';
import { useUiStore } from '../store/ui';
import { Spinner } from '../components/LoadingSkeleton';
import type { DeviceCodeResponse } from '../types';
import styles from './AuthPage.module.css';

type AuthStatus = 'loading' | 'showing_code' | 'expired' | 'error';

export const AuthPage = memo(function AuthPage(): ReactElement {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [deviceCode, setDeviceCode] = useState<DeviceCodeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const login = useAuthStore((s) => s.login);
  const navigate = useUiStore((s) => s.navigate);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<number>(5000);
  const mountedRef = useRef(true);

  const stopPolling = useCallback((): void => {
    if (pollTimerRef.current !== null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const schedulePoll = useCallback((code: string, intervalMs: number): void => {
    pollTimerRef.current = window.setTimeout(async () => {
      try {
        const tokens = await pollForToken(code);
        if (!mountedRef.current) return;

        stopPolling();
        login(tokens);
        navigate('home');
      } catch (err) {
        if (!mountedRef.current) return;

        if (err instanceof AuthRequestError && err.errorCode === 'authorization_pending') {
          schedulePoll(code, pollIntervalRef.current);
          return;
        }

        if (err instanceof AuthRequestError && err.errorCode === 'slow_down') {
          pollIntervalRef.current = pollIntervalRef.current + 5000;
          schedulePoll(code, pollIntervalRef.current);
          return;
        }

        if (err instanceof AuthRequestError && err.errorCode === 'expired_token') {
          stopPolling();
          setStatus('expired');
          return;
        }

        stopPolling();
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Authentication failed');
      }
    }, intervalMs);
  }, [login, navigate, stopPolling]);

  const startPolling = useCallback((code: string, intervalMs: number): void => {
    stopPolling();
    pollIntervalRef.current = intervalMs;
    schedulePoll(code, intervalMs);
  }, [stopPolling, schedulePoll]);

  const startAuth = useCallback(async (): Promise<void> => {
    setStatus('loading');
    stopPolling();

    try {
      const response = await getDeviceCode();
      if (!mountedRef.current) return;

      setDeviceCode(response);
      setStatus('showing_code');

      const intervalMs = Math.max(response.interval * 1000, 5000);
      startPolling(response.code, intervalMs);
    } catch (err) {
      if (!mountedRef.current) return;
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to get device code');
    }
  }, [stopPolling, startPolling]);

  useEffect(() => {
    mountedRef.current = true;
    startAuth();
    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [startAuth, stopPolling]);

  useEffect(() => {
    if (status !== 'expired') return;
    const timerId = window.setTimeout(() => {
      startAuth();
    }, 5000);
    return () => {
      window.clearTimeout(timerId);
    };
  }, [status, startAuth]);

  useEffect(() => {
    if (status !== 'error') return undefined;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Enter') {
        startAuth();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [status, startAuth]);

  if (status === 'loading' || status === 'expired') {
    return (
      <div className={styles.container}>
        <Spinner />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Authentication Error</h1>
        <p className={styles.message}>{errorMessage}</p>
        <p className={styles.hint}>Press Enter to retry</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Sign In</h1>
      <p className={styles.instruction}>Go to</p>
      <p className={styles.url}>{deviceCode?.verification_uri ?? 'kino.pub/device'}</p>
      <p className={styles.instruction}>and enter the code</p>
      <p className={styles.code}>{deviceCode?.user_code ?? ''}</p>
      <div className={styles.pollingIndicator}>
        <div className={styles.pollingDot} />
        <span className={styles.pollingText}>Waiting for activation...</span>
      </div>
    </div>
  );
});
