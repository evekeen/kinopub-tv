import {
  ReactElement,
  createContext,
  useContext,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Hls from 'hls.js';
import type { HlsConfig } from 'hls.js';

type ErrorKind = 'network' | 'media' | 'fatal';

type AudioTracksCallback = (tracks: HlsAudioTrack[]) => void;

interface PlayerContextValue {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  loadSource: (url: string, onAudioTracksReady?: AudioTracksCallback) => void;
  destroy: () => void;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getAudioTracks: () => HlsAudioTrack[];
  setAudioTrack: (id: number) => void;
  hlsError: ErrorKind | null;
  retryLoad: () => void;
}

interface HlsAudioTrack {
  id: number;
  name: string;
  lang: string;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 16000;
const MAX_RETRIES = 5;

const VIDEO_STYLE: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '1920px',
  height: '1080px',
  zIndex: -1,
  backgroundColor: '#000000',
};

const HLS_CONFIG: Partial<HlsConfig> = {
  maxBufferLength: 30,
  maxMaxBufferLength: 60,
  enableWorker: false,
};

interface PlayerProviderProps {
  children: ReactElement;
}

export function PlayerProvider({ children }: PlayerProviderProps): ReactElement {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryCountRef = useRef(0);
  const mediaRecoveryCountRef = useRef(0);
  const retryTimerRef = useRef<number | null>(null);
  const lastUrlRef = useRef<string | null>(null);
  const audioTracksCallbackRef = useRef<AudioTracksCallback | null>(null);
  const [errorState, setErrorState] = useState<ErrorKind | null>(null);

  const clearRetryTimer = useCallback((): void => {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const destroyHls = useCallback((): void => {
    clearRetryTimer();
    if (hlsRef.current !== null) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    setErrorState(null);
    retryCountRef.current = 0;
    mediaRecoveryCountRef.current = 0;
    lastUrlRef.current = null;
    audioTracksCallbackRef.current = null;
  }, [clearRetryTimer]);

  const loadSource = useCallback(
    (url: string, onAudioTracksReady?: AudioTracksCallback): void => {
      const video = videoRef.current;
      if (video === null) return;

      destroyHls();
      lastUrlRef.current = url;
      audioTracksCallbackRef.current = onAudioTracksReady || null;
      setErrorState(null);

      if (!Hls.isSupported()) {
        video.src = url;
        return;
      }

      const hls = new Hls(HLS_CONFIG);
      hlsRef.current = hls;

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          setErrorState('network');

          if (retryCountRef.current < MAX_RETRIES) {
            const delay = Math.min(
              BACKOFF_BASE_MS * Math.pow(2, retryCountRef.current),
              BACKOFF_MAX_MS,
            );
            retryCountRef.current += 1;
            retryTimerRef.current = window.setTimeout(() => {
              hls.startLoad();
            }, delay);
          } else {
            setErrorState('fatal');
          }
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          if (mediaRecoveryCountRef.current < 2) {
            setErrorState('media');
            mediaRecoveryCountRef.current += 1;
            hls.recoverMediaError();
          } else {
            setErrorState('fatal');
          }
        } else {
          setErrorState('fatal');
        }
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setErrorState(null);
        retryCountRef.current = 0;
        mediaRecoveryCountRef.current = 0;
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.FRAG_LOADED, () => {
        setErrorState((prev) => {
          if (prev === 'network') {
            retryCountRef.current = 0;
            return null;
          }
          return prev;
        });
      });

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
        if (audioTracksCallbackRef.current !== null) {
          const tracks = hls.audioTracks.map((track, index) => ({
            id: index,
            name: track.name || 'Track ' + (index + 1),
            lang: track.lang || '',
          }));
          audioTracksCallbackRef.current(tracks);
          audioTracksCallbackRef.current = null;
        }
      });

      hls.attachMedia(video);
      hls.loadSource(url);
    },
    [destroyHls],
  );

  const retryLoad = useCallback((): void => {
    if (lastUrlRef.current !== null) {
      retryCountRef.current = 0;
      loadSource(lastUrlRef.current);
    }
  }, [loadSource]);

  const play = useCallback((): void => {
    videoRef.current?.play().catch(() => {});
  }, []);

  const pause = useCallback((): void => {
    videoRef.current?.pause();
  }, []);

  const seek = useCallback((time: number): void => {
    const video = videoRef.current;
    if (video !== null) {
      video.currentTime = Math.max(0, Math.min(time, video.duration || 0));
    }
  }, []);

  const getAudioTracks = useCallback((): HlsAudioTrack[] => {
    const hls = hlsRef.current;
    if (hls === null) return [];

    return hls.audioTracks.map((track, index) => ({
      id: index,
      name: track.name || 'Track ' + (index + 1),
      lang: track.lang || '',
    }));
  }, []);

  const setAudioTrack = useCallback((id: number): void => {
    const hls = hlsRef.current;
    if (hls !== null) {
      hls.audioTrack = id;
    }
  }, []);

  useEffect(() => {
    return () => {
      destroyHls();
    };
  }, [destroyHls]);

  const value = useMemo(
    (): PlayerContextValue => ({
      videoRef,
      loadSource,
      destroy: destroyHls,
      play,
      pause,
      seek,
      getAudioTracks,
      setAudioTrack,
      hlsError: errorState,
      retryLoad,
    }),
    [
      loadSource,
      destroyHls,
      play,
      pause,
      seek,
      getAudioTracks,
      setAudioTrack,
      retryLoad,
      errorState,
    ],
  );

  return (
    <PlayerContext.Provider value={value}>
      <video
        ref={videoRef}
        style={VIDEO_STYLE}
      />
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayerContext(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (ctx === null) {
    throw new Error('usePlayerContext must be used within PlayerProvider');
  }
  return ctx;
}

export type { PlayerContextValue, HlsAudioTrack, ErrorKind };
