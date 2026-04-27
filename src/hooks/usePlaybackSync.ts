import { useEffect, useRef } from 'react';
import { markTime } from '../api/watching';
import { logWatchingError } from '../utils/logger';

const SYNC_INTERVAL_MS = 10000;

export function usePlaybackSync(
  itemId: number | undefined,
  videoNumber: number | undefined,
  getCurrentTime: () => number,
  isPlaying: boolean,
  seasonNumber?: number,
): void {
  const lastSyncedTime = useRef(0);
  const itemIdRef = useRef(itemId);
  const videoNumberRef = useRef(videoNumber);
  const seasonNumberRef = useRef(seasonNumber);
  const getCurrentTimeRef = useRef(getCurrentTime);

  itemIdRef.current = itemId;
  videoNumberRef.current = videoNumber;
  seasonNumberRef.current = seasonNumber;
  getCurrentTimeRef.current = getCurrentTime;

  const sync = useRef((): void => {
    const id = itemIdRef.current;
    const vid = videoNumberRef.current;
    const season = seasonNumberRef.current;
    if (id === undefined || vid === undefined) return;
    const currentTime = Math.floor(getCurrentTimeRef.current());
    if (currentTime > 0 && currentTime !== lastSyncedTime.current) {
      lastSyncedTime.current = currentTime;
      markTime(id, vid, currentTime, season).catch((err: unknown) => logWatchingError('markTime', err));
    }
  });

  useEffect(() => {
    if (itemId === undefined || videoNumber === undefined) return;
    if (!isPlaying) {
      sync.current();
      return;
    }

    const intervalId = window.setInterval(sync.current, SYNC_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      sync.current();
    };
  }, [itemId, videoNumber, isPlaying]);

  useEffect(() => {
    return () => {
      const id = itemIdRef.current;
      const vid = videoNumberRef.current;
      const season = seasonNumberRef.current;
      if (id === undefined || vid === undefined) return;
      const currentTime = Math.floor(getCurrentTimeRef.current());
      if (currentTime > 0 && currentTime !== lastSyncedTime.current) {
        markTime(id, vid, currentTime, season).catch((err: unknown) => logWatchingError('markTime', err));
      }
    };
  }, []);
}
