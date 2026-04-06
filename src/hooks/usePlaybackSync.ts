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
  const itemIdRef = useRef(itemId);
  const videoIdRef = useRef(videoId);
  const getCurrentTimeRef = useRef(getCurrentTime);

  itemIdRef.current = itemId;
  videoIdRef.current = videoId;
  getCurrentTimeRef.current = getCurrentTime;

  useEffect(() => {
    if (itemId === undefined || videoId === undefined || !isPlaying) {
      return;
    }

    const sync = (): void => {
      const id = itemIdRef.current;
      const vid = videoIdRef.current;
      if (id === undefined || vid === undefined) return;
      const currentTime = Math.floor(getCurrentTimeRef.current());
      if (currentTime > 0 && currentTime !== lastSyncedTime.current) {
        lastSyncedTime.current = currentTime;
        markTime(id, vid, currentTime).catch(() => {});
      }
    };

    const intervalId = window.setInterval(sync, SYNC_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      sync();
    };
  }, [itemId, videoId, isPlaying]);

  useEffect(() => {
    return () => {
      const id = itemIdRef.current;
      const vid = videoIdRef.current;
      if (id === undefined || vid === undefined) return;
      const currentTime = Math.floor(getCurrentTimeRef.current());
      if (currentTime > 0 && currentTime !== lastSyncedTime.current) {
        markTime(id, vid, currentTime).catch(() => {});
      }
    };
  }, []);
}
