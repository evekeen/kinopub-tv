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
  const goBack = useUiStore((s) => s.goBack);

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

      const hlsUrl = bestFile.url.hls;
      setTitle(bestFile.quality);
      setSubtitles(mediaLinks.subtitles);
      setMedia(hlsUrl, [], mediaLinks.subtitles);
      playerRef.current.loadSource(hlsUrl, (tracks) => {
        setAudioTracks(tracks);
      });
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load media'));
      setLoading(false);
    }
  }, [mediaId, setMedia]);

  useEffect(() => {
    fetchAndPlay();

    return () => {
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

  useEffect(() => {
    const video = player.videoRef.current;
    if (video === null) return;

    const onPlay = (): void => setPlaying(true);
    const onPause = (): void => setPlaying(false);
    const onDurationChange = (): void => setDuration(video.duration || 0);
    const onEnded = (): void => {
      setPlaying(false);
      goBack();
    };
    const onTimeUpdate = (): void => {
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
    video.addEventListener('progress', onProgress);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('progress', onProgress);
    };
  }, [player.videoRef, setPlaying, setCurrentTime, setDuration, goBack]);

  const getCurrentTime = useCallback((): number => {
    return player.videoRef.current?.currentTime ?? currentTimeRef.current;
  }, [player.videoRef]);

  usePlaybackSync(contentId, mediaId, getCurrentTime, isPlaying);

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
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  }, [isPlaying, player]);

  const handleSeek = useCallback(
    (time: number): void => {
      player.seek(time);
    },
    [player],
  );

  const handleSelectAudio = useCallback(
    (id: number): void => {
      player.setAudioTrack(id);
      setSelectedAudioTrack(id);
    },
    [player, setSelectedAudioTrack],
  );

  const handleSelectSubtitle = useCallback(
    (index: number | null): void => {
      setSelectedSubtitle(index);
    },
    [setSelectedSubtitle],
  );

  const handleBack = useCallback((): void => {
    goBack();
  }, [goBack]);

  const remoteHandlers: RemoteKeyMap = useMemo(() => ({
    playPause: handlePlayPause,
    play: () => player.play(),
    pause: () => player.pause(),
    stop: handleBack,
    back: handleBack,
    fastForward: () => handleSeek(currentTimeRef.current + SEEK_JUMP_S),
    rewind: () => handleSeek(Math.max(0, currentTimeRef.current - SEEK_JUMP_S)),
    channelUp: () => handleSeek(currentTimeRef.current + SEEK_JUMP_S),
    channelDown: () => handleSeek(Math.max(0, currentTimeRef.current - SEEK_JUMP_S)),
  }), [handlePlayPause, player, handleBack, handleSeek]);

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
        onSelectAudio={handleSelectAudio}
        onSelectSubtitle={handleSelectSubtitle}
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
