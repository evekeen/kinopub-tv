import { ReactElement, memo, useCallback, useEffect } from 'react';
import styles from './NetworkError.module.css';

interface NetworkErrorProps {
  message?: string;
  onRetry: () => void;
}

export const NetworkError = memo(function NetworkError({
  message,
  onRetry,
}: NetworkErrorProps): ReactElement {
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  const displayMessage = message
    ?? (isOffline ? 'No internet connection' : 'Network error occurred');

  const handleKeyDown = useCallback(
    (event: KeyboardEvent): void => {
      if (event.key === 'Enter') {
        onRetry();
      }
    },
    [onRetry],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div className={styles.container}>
      <div className={styles.icon}>{isOffline ? '⊘' : '↻'}</div>
      <h1 className={styles.title}>{displayMessage}</h1>
      <p className={styles.hint}>Press Enter to retry</p>
    </div>
  );
});
