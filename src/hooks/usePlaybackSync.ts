import { useEffect, useRef } from 'react';
import { markTime } from '../api/watching';

const SYNC_INTERVAL_MS = 30000;

export function usePlaybackSync(
  itemId: number | undefined,
  videoId: number | undefined,
  getCurrentTime: () => number,
  isPlaying: boolean,
): void {
  const lastSyncedTime = useRef(0);

  useEffect(() => {
    if (itemId === undefined || videoId === undefined || !isPlaying) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const currentTime = Math.floor(getCurrentTime());
      if (currentTime > 0 && currentTime !== lastSyncedTime.current) {
        lastSyncedTime.current = currentTime;
        markTime(itemId, videoId, currentTime).catch(() => {});
      }
    }, SYNC_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [itemId, videoId, getCurrentTime, isPlaying]);

  useEffect(() => {
    return () => {
      if (itemId === undefined || videoId === undefined) return;
      const currentTime = Math.floor(getCurrentTime());
      if (currentTime > 0) {
        markTime(itemId, videoId, currentTime).catch(() => {});
      }
    };
  }, [itemId, videoId, getCurrentTime]);
}
