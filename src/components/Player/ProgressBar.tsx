import { ReactElement, memo, useCallback, useRef, useEffect, useState } from 'react';
import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  buffered: number;
  onSeek: (time: number) => void;
  focused: boolean;
}

const SEEK_STEP_S = 10;

function formatTime(seconds: number): string {
  const totalSecs = Math.floor(seconds);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;

  const pad = (n: number): string => (n < 10 ? '0' + n : '' + n);

  if (h > 0) {
    return h + ':' + pad(m) + ':' + pad(s);
  }
  return m + ':' + pad(s);
}

export const ProgressBar = memo(function ProgressBar({
  currentTime,
  duration,
  buffered,
  onSeek,
  focused,
}: ProgressBarProps): ReactElement {
  const [seekPreview, setSeekPreview] = useState<number | null>(null);
  const seekTimerRef = useRef<number | null>(null);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;
  const previewPercent = seekPreview !== null && duration > 0
    ? (seekPreview / duration) * 100
    : null;

  const pendingTargetRef = useRef<number | null>(null);

  const handleSeekLeft = useCallback((): void => {
    const base = pendingTargetRef.current !== null ? pendingTargetRef.current : currentTime;
    const target = Math.max(0, base - SEEK_STEP_S);
    pendingTargetRef.current = target;
    setSeekPreview(target);
    if (seekTimerRef.current !== null) {
      window.clearTimeout(seekTimerRef.current);
    }
    seekTimerRef.current = window.setTimeout(() => {
      onSeek(target);
      setSeekPreview(null);
      seekTimerRef.current = null;
      pendingTargetRef.current = null;
    }, 300);
  }, [currentTime, onSeek]);

  const handleSeekRight = useCallback((): void => {
    const base = pendingTargetRef.current !== null ? pendingTargetRef.current : currentTime;
    const target = Math.min(duration, base + SEEK_STEP_S);
    pendingTargetRef.current = target;
    setSeekPreview(target);
    if (seekTimerRef.current !== null) {
      window.clearTimeout(seekTimerRef.current);
    }
    seekTimerRef.current = window.setTimeout(() => {
      onSeek(target);
      setSeekPreview(null);
      seekTimerRef.current = null;
      pendingTargetRef.current = null;
    }, 300);
  }, [currentTime, duration, onSeek]);

  useEffect(() => {
    if (!focused) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.keyCode === 37 || event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        handleSeekLeft();
      } else if (event.keyCode === 39 || event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        handleSeekRight();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [focused, handleSeekLeft, handleSeekRight]);

  useEffect(() => {
    return () => {
      if (seekTimerRef.current !== null) {
        window.clearTimeout(seekTimerRef.current);
      }
    };
  }, []);

  const barClass = focused ? styles.barFocused : styles.bar;
  const displayTime = seekPreview !== null ? seekPreview : currentTime;

  return (
    <div className={styles.container}>
      <span className={styles.time}>{formatTime(displayTime)}</span>
      <div className={barClass}>
        <div
          className={styles.buffered}
          style={{ width: bufferedPercent + '%' }}
        />
        <div
          className={styles.progress}
          style={{ width: progressPercent + '%' }}
        />
        {previewPercent !== null && (
          <div
            className={styles.preview}
            style={{ width: previewPercent + '%' }}
          />
        )}
        {focused && (
          <div
            className={styles.thumb}
            style={{ left: progressPercent + '%' }}
          />
        )}
      </div>
      <span className={styles.time}>{formatTime(duration)}</span>
    </div>
  );
});

export { formatTime };
