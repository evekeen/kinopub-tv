import {
  ReactElement,
  memo,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  useFocusable,
  setFocus,
} from '@noriginmedia/norigin-spatial-navigation';
import { PlayerOverlay } from '../components/Player/PlayerOverlay';
import { SubtitleRenderer } from '../components/Player/SubtitleRenderer';
import { NetworkError } from '../components/NetworkError';
import { Spinner } from '../components/LoadingSkeleton';
import { usePlayerContext } from '../contexts/PlayerContext';
import { usePlaybackSync } from '../hooks/usePlaybackSync';
import { useSubtitles } from '../hooks/useSubtitles';
import { useRemoteKeys } from '../hooks/useRemoteKeys';
import { getMediaLinks } from '../api/media';
import { markTime, toggleWatched } from '../api/watching';
import { logWatchingError } from '../utils/logger';
import { usePlayerStore } from '../store/player';
import { useUiStore } from '../store/ui';
import type { HlsAudioTrack } from '../contexts/PlayerContext';
import type { Subtitle, MediaFile } from '../types';
import type { RemoteKeyMap } from '../hooks/useRemoteKeys';
import styles from './PlayerPage.module.css';

const SEEK_JUMP_S = 30;

function pickBestFile(files: MediaFile[]): MediaFile | null {
  if (files.length === 0) return null;
  const sorted = [...files].sort((a, b) => b.quality_id - a.quality_id);
  return sorted[0];
}

export const PlayerPage = memo(function PlayerPage(): ReactElement {
  const contentId = useUiStore((s) => s.screenParams.contentId);
  const mediaId = useUiStore((s) => s.screenParams.mediaId);
  const seasonNumber = useUiStore((s) => s.screenParams.seasonNumber);
  const episodeNumber = useUiStore((s) => s.screenParams.episodeNumber);
  const screenTitle = useUiStore((s) => s.screenParams.title);
  const resumeTime = useUiStore((s) => s.screenParams.resumeTime);
  const alreadyWatched = useUiStore((s) => s.screenParams.alreadyWatched);
  const goBack = useUiStore((s) => s.goBack);

  if (seasonNumber !== undefined && episodeNumber === undefined) {
    throw new Error('PlayerPage: serial navigation requires episodeNumber when seasonNumber is set');
  }
  const videoNumber = episodeNumber ?? 1;

  const setMedia = usePlayerStore((s) => s.setMedia);
  const setPlaying = usePlayerStore((s) => s.setPlaying);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const setSelectedAudioTrack = usePlayerStore((s) => s.setSelectedAudioTrack);
  const setSelectedSubtitle = usePlayerStore((s) => s.setSelectedSubtitle);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const selectedAudioTrack = usePlayerStore((s) => s.selectedAudioTrack);
  const selectedSubtitle = usePlayerStore((s) => s.selectedSubtitle);
  const reset = usePlayerStore((s) => s.reset);

  const player = usePlayerContext();
  const playerRef = useRef(player);
  playerRef.current = player;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [buffered, setBuffered] = useState(0);
  const [audioTracks, setAudioTracks] = useState<HlsAudioTrack[]>([]);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [title, setTitle] = useState('');
  const currentTimeRef = useRef(0);
  const seekingRef = useRef(false);
  const resumeSeekRef = useRef<{ time: number; applied: boolean } | null>(null);
  const resumeListenersRef = useRef<(() => void) | null>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const watchedMarkedRef = useRef(alreadyWatched === true);
  const backingOutRef = useRef(false);
  const contentIdRef = useRef(contentId);
  contentIdRef.current = contentId;
  const mediaIdRef = useRef(mediaId);
  mediaIdRef.current = mediaId;

  currentTimeRef.current = currentTime;

  const fetchAndPlay = useCallback(async (): Promise<void> => {
    if (mediaId === undefined) {
      setError(new Error('No media ID provided'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const mediaLinks = await getMediaLinks(mediaId);
      const bestFile = pickBestFile(mediaLinks.files);
      if (bestFile === null) {
        setError(new Error('No video files available'));
        setLoading(false);
        return;
      }

      const hlsUrl = bestFile.url.hls4 ?? bestFile.url.hls;
      setTitle(screenTitle ?? bestFile.quality);
      setSubtitles(mediaLinks.subtitles);
      setMedia(hlsUrl, [], mediaLinks.subtitles);

      const engSubIndex = mediaLinks.subtitles.findIndex((s) => s.lang === 'eng');
      if (engSubIndex !== -1) {
        setSelectedSubtitle(engSubIndex);
      }

      playerRef.current.loadSource(hlsUrl, (tracks) => {
        setAudioTracks(tracks);
        const engTrack = tracks.find((t) => t.lang === 'eng');
        if (engTrack !== undefined) {
          playerRef.current.setAudioTrack(engTrack.id);
          setSelectedAudioTrack(engTrack.id);
        }
      });

      if (resumeTime !== undefined && resumeTime > 0) {
        const video = playerRef.current.videoRef.current;
        if (video !== null) {
          if (resumeListenersRef.current !== null) {
            resumeListenersRef.current();
          }
          resumeSeekRef.current = { time: resumeTime, applied: false };

          const attemptSeek = (): boolean => {
            const entry = resumeSeekRef.current;
            if (entry === null || entry.applied) return true;
            const duration = video.duration;
            if (!isFinite(duration) || duration <= 0) return false;
            playerRef.current.seek(entry.time);
            entry.applied = true;
            return true;
          };

          const onReady = (): void => {
            if (attemptSeek() && resumeListenersRef.current !== null) {
              resumeListenersRef.current();
            }
          };

          video.addEventListener('loadedmetadata', onReady);
          video.addEventListener('canplay', onReady);
          video.addEventListener('durationchange', onReady);

          resumeListenersRef.current = (): void => {
            video.removeEventListener('loadedmetadata', onReady);
            video.removeEventListener('canplay', onReady);
            video.removeEventListener('durationchange', onReady);
            resumeListenersRef.current = null;
          };

          attemptSeek();
        }
      }
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load media'));
      setLoading(false);
    }
  }, [mediaId, screenTitle, resumeTime, setMedia, setSelectedSubtitle, setSelectedAudioTrack]);

  useEffect(() => {
    fetchAndPlay();

    return () => {
      if (resumeListenersRef.current !== null) {
        resumeListenersRef.current();
      }
      resumeSeekRef.current = null;
      playerRef.current.destroy();
      reset();
    };
  }, [fetchAndPlay, reset]);

  useEffect(() => {
    const video = player.videoRef.current;
    if (video === null) return;

    video.style.zIndex = '10';

    return () => {
      video.style.zIndex = '-1';
    };
  }, [player.videoRef]);

  const getCurrentTime = useCallback((): number => {
    const video = player.videoRef.current;
    if (video !== null && video.readyState > 0) return video.currentTime;
    return currentTimeRef.current;
  }, [player.videoRef]);

  const handleBack = useCallback((): void => {
    if (backingOutRef.current) return;
    if (contentId !== undefined && mediaId !== undefined) {
      const time = Math.floor(getCurrentTime());
      if (time > 0) {
        backingOutRef.current = true;
        const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, 2000));
        Promise.race([
          markTime(contentId, videoNumber, time, seasonNumber).catch((err: unknown) => logWatchingError('markTime:back', err)),
          timeout,
        ]).then(() => goBack());
        return;
      }
    }
    goBack();
  }, [contentId, mediaId, videoNumber, seasonNumber, getCurrentTime, goBack]);

  useEffect(() => {
    const video = player.videoRef.current;
    if (video === null) return;

    const onPlay = (): void => setPlaying(true);
    const onPause = (): void => setPlaying(false);
    const onDurationChange = (): void => setDuration(video.duration || 0);
    const onEnded = (): void => {
      setPlaying(false);
      handleBack();
    };
    const onTimeUpdate = (): void => {
      if (!seekingRef.current) {
        const time = video.currentTime || 0;
        setCurrentTime(time);
        if (
          !watchedMarkedRef.current &&
          contentId !== undefined &&
          mediaId !== undefined &&
          isFinite(video.duration) &&
          video.duration > 0 &&
          time / video.duration >= 0.9
        ) {
          watchedMarkedRef.current = true;
          toggleWatched(contentId, videoNumber, seasonNumber, 1).catch((err: unknown) => logWatchingError('toggleWatched:90%', err));
        }
      }
    };
    const onSeeked = (): void => {
      seekingRef.current = false;
      setCurrentTime(video.currentTime || 0);
    };
    const onProgress = (): void => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('ended', onEnded);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('progress', onProgress);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('progress', onProgress);
    };
  }, [player.videoRef, setPlaying, setCurrentTime, setDuration, handleBack, contentId, mediaId, videoNumber, seasonNumber]);

  usePlaybackSync(contentId, videoNumber, getCurrentTime, isPlaying, seasonNumber);

  const { currentCue, loadSubtitle, clearSubtitle } = useSubtitles(currentTime);

  useEffect(() => {
    if (selectedSubtitle === null) {
      clearSubtitle();
      return;
    }
    const sub = subtitles[selectedSubtitle];
    if (sub !== undefined) {
      loadSubtitle(sub.url, sub.shift);
    }
  }, [selectedSubtitle, subtitles, loadSubtitle, clearSubtitle]);

  const handlePlayPause = useCallback((): void => {
    if (isPlayingRef.current) {
      playerRef.current.pause();
    } else {
      playerRef.current.play();
    }
  }, []);

  const handleSeek = useCallback(
    (time: number): void => {
      seekingRef.current = true;
      currentTimeRef.current = time;
      setCurrentTime(time);
      playerRef.current.seek(time);
    },
    [setCurrentTime],
  );

  const handleSeekForward = useCallback((): void => {
    handleSeek(currentTimeRef.current + SEEK_JUMP_S);
  }, [handleSeek]);

  const handleSeekBackward = useCallback((): void => {
    handleSeek(Math.max(0, currentTimeRef.current - SEEK_JUMP_S));
  }, [handleSeek]);

  const handleSelectAudio = useCallback(
    (id: number): void => {
      playerRef.current.setAudioTrack(id);
      setSelectedAudioTrack(id);
    },
    [setSelectedAudioTrack],
  );

  const handlePlay = useCallback((): void => {
    playerRef.current.play();
  }, []);

  const handlePause = useCallback((): void => {
    playerRef.current.pause();
  }, []);

  const remoteHandlers: RemoteKeyMap = useMemo(() => ({
    playPause: handlePlayPause,
    play: handlePlay,
    pause: handlePause,
    fastForward: handleSeekForward,
    rewind: handleSeekBackward,
    channelUp: handleSeekForward,
    channelDown: handleSeekBackward,
  }), [handlePlayPause, handlePlay, handlePause, handleSeekForward, handleSeekBackward]);

  useRemoteKeys(remoteHandlers);

  if (error) {
    return (
      <div className={styles.containerWithBg}>
        <NetworkError message={error.message} onRetry={fetchAndPlay} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.containerWithBg}>
        <Spinner />
      </div>
    );
  }

  if (player.hlsError === 'network' || player.hlsError === 'fatal') {
    return (
      <div className={styles.containerWithBg}>
        <div className={styles.errorOverlay}>
          <div className={styles.errorText}>
            {player.hlsError === 'network'
              ? 'Network error \u2014 retrying...'
              : 'Playback failed'}
          </div>
          {player.hlsError === 'fatal' && (
            <FocusableRetryButton onRetry={player.retryLoad} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <SubtitleRenderer text={currentCue} />
      <PlayerOverlay
        title={title}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        buffered={buffered}
        audioTracks={audioTracks}
        subtitles={subtitles}
        selectedAudioTrack={selectedAudioTrack}
        selectedSubtitle={selectedSubtitle}
        onPlayPause={handlePlayPause}
        onSeek={handleSeek}
        onBack={handleBack}
        onSelectAudio={handleSelectAudio}
        onSelectSubtitle={setSelectedSubtitle}
      />
    </div>
  );
});

const RETRY_FOCUS_KEY = 'player-retry-button';

interface FocusableRetryButtonProps {
  onRetry: () => void;
}

const FocusableRetryButton = memo(function FocusableRetryButton({
  onRetry,
}: FocusableRetryButtonProps): ReactElement {
  const { ref, focused } = useFocusable({
    onEnterPress: onRetry,
    focusKey: RETRY_FOCUS_KEY,
  });

  useEffect(() => {
    setFocus(RETRY_FOCUS_KEY);
  }, []);

  const buttonClass = focused
    ? styles.retryButton + ' ' + styles.retryButtonFocused
    : styles.retryButton;

  return (
    <div ref={ref} className={buttonClass}>
      Press Enter to retry
    </div>
  );
});
