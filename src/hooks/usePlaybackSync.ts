import { useEffect, useRef } from 'react';
import { markTime } from '../api/watching';
import { logWatchingError } from '../utils/logger';

const SYNC_INTERVAL_MS = 10000;

export function usePlaybackSync(
  itemId: number | undefined,
  videoId: number | undefined,
  getCurrentTime: () => number,
  isPlaying: boolean,
): void {
  const lastSyncedTime = useRef(0);
  const itemIdRef = useRef(itemId);
  const videoIdRef = useRef(videoId);
  const getCurrentTimeRef = useRef(getCurrentTime);

  itemIdRef.current = itemId;
  videoIdRef.current = videoId;
  getCurrentTimeRef.current = getCurrentTime;

  const sync = useRef((): void => {
    const id = itemIdRef.current;
    const vid = videoIdRef.current;
    if (id === undefined || vid === undefined) return;
    const currentTime = Math.floor(getCurrentTimeRef.current());
    if (currentTime > 0 && currentTime !== lastSyncedTime.current) {
      lastSyncedTime.current = currentTime;
      markTime(id, vid, currentTime).catch((err: unknown) => logWatchingError('markTime', err));
    }
  });

  useEffect(() => {
    if (itemId === undefined || videoId === undefined) return;
    if (!isPlaying) {
      sync.current();
      return;
    }

    const intervalId = window.setInterval(sync.current, SYNC_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      sync.current();
    };
  }, [itemId, videoId, isPlaying]);

  useEffect(() => {
    return () => {
      const id = itemIdRef.current;
      const vid = videoIdRef.current;
      if (id === undefined || vid === undefined) return;
      const currentTime = Math.floor(getCurrentTimeRef.current());
      if (currentTime > 0 && currentTime !== lastSyncedTime.current) {
        markTime(id, vid, currentTime).catch((err: unknown) => logWatchingError('markTime', err));
      }
    };
  }, []);
}
