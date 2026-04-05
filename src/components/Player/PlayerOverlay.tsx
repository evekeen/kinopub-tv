import {
  ReactElement,
  memo,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import {
  useFocusable,
  FocusContext,
  setFocus,
} from '@noriginmedia/norigin-spatial-navigation';
import { ProgressBar } from './ProgressBar';
import { TrackPicker } from './TrackPicker';
import type { HlsAudioTrack } from '../../contexts/PlayerContext';
import type { Subtitle } from '../../types';
import styles from './PlayerOverlay.module.css';

interface PlayerOverlayProps {
  title: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  audioTracks: HlsAudioTrack[];
  subtitles: Subtitle[];
  selectedAudioTrack: number | null;
  selectedSubtitle: number | null;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSelectAudio: (id: number) => void;
  onSelectSubtitle: (index: number | null) => void;
}

const AUTO_HIDE_MS = 5000;

export const PlayerOverlay = memo(function PlayerOverlay({
  title,
  isPlaying,
  currentTime,
  duration,
  buffered,
  audioTracks,
  subtitles,
  selectedAudioTrack,
  selectedSubtitle,
  onPlayPause,
  onSeek,
  onSelectAudio,
  onSelectSubtitle,
}: PlayerOverlayProps): ReactElement {
  const [visible, setVisible] = useState(true);
  const [showTrackPicker, setShowTrackPicker] = useState(false);
  const [focusedElement, setFocusedElement] = useState<'playPause' | 'progress' | 'tracks'>('progress');
  const hideTimerRef = useRef<number | null>(null);

  const resetHideTimer = useCallback((): void => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      if (!showTrackPicker) {
        setVisible(false);
      }
    }, AUTO_HIDE_MS);
  }, [showTrackPicker]);

  const showOverlay = useCallback((): void => {
    setVisible(true);
    resetHideTimer();
  }, [resetHideTimer]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, [resetHideTimer]);

  useEffect(() => {
    const handleAnyKey = (): void => {
      if (!visible) {
        showOverlay();
      } else {
        resetHideTimer();
      }
    };

    window.addEventListener('keydown', handleAnyKey);
    return () => {
      window.removeEventListener('keydown', handleAnyKey);
    };
  }, [visible, showOverlay, resetHideTimer]);

  const handleOpenTracks = useCallback((): void => {
    setShowTrackPicker(true);
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }
  }, []);

  const handleCloseTracks = useCallback((): void => {
    setShowTrackPicker(false);
    resetHideTimer();
    requestAnimationFrame(() => {
      setFocus('player-overlay-tracks-btn');
    });
  }, [resetHideTimer]);

  const { ref: overlayRef, focusKey: overlayFocusKey } = useFocusable({
    trackChildren: true,
    saveLastFocusedChild: true,
    focusKey: 'player-overlay',
    isFocusBoundary: true,
  });

  const handlePlayPauseFocus = useCallback((): void => {
    setFocusedElement('playPause');
  }, []);

  const handleProgressFocus = useCallback((): void => {
    setFocusedElement('progress');
  }, []);

  const handleTracksBtnFocus = useCallback((): void => {
    setFocusedElement('tracks');
  }, []);

  const { ref: playPauseRef } = useFocusable({
    onEnterPress: onPlayPause,
    focusKey: 'player-overlay-play-pause',
    onFocus: handlePlayPauseFocus,
  });

  const { ref: progressRef } = useFocusable({
    focusKey: 'player-overlay-progress',
    onFocus: handleProgressFocus,
  });

  const { ref: tracksBtnRef } = useFocusable({
    onEnterPress: handleOpenTracks,
    focusKey: 'player-overlay-tracks-btn',
    onFocus: handleTracksBtnFocus,
  });

  useEffect(() => {
    if (visible && !showTrackPicker) {
      requestAnimationFrame(() => {
        setFocus('player-overlay-progress');
      });
    }
  }, [visible, showTrackPicker]);

  const playPauseIcon = isPlaying ? '\u275A\u275A' : '\u25B6';

  const hasExtraTracks = useMemo(
    () => audioTracks.length > 1 || subtitles.length > 0,
    [audioTracks.length, subtitles.length],
  );

  if (!visible && !showTrackPicker) {
    return <div />;
  }

  return (
    <FocusContext.Provider value={overlayFocusKey}>
      <div ref={overlayRef} className={styles.overlay}>
        {visible && (
          <>
            <div className={styles.topBar}>
              <div className={styles.title}>{title}</div>
            </div>
            <div className={styles.bottomBar}>
              <div className={styles.controls}>
                <div
                  ref={playPauseRef}
                  className={
                    focusedElement === 'playPause'
                      ? styles.playPauseFocused
                      : styles.playPause
                  }
                >
                  {playPauseIcon}
                </div>
                <div ref={progressRef} className={styles.progressWrapper}>
                  <ProgressBar
                    currentTime={currentTime}
                    duration={duration}
                    buffered={buffered}
                    onSeek={onSeek}
                    focused={focusedElement === 'progress'}
                  />
                </div>
                {hasExtraTracks && (
                  <div
                    ref={tracksBtnRef}
                    className={
                      focusedElement === 'tracks'
                        ? styles.tracksButtonFocused
                        : styles.tracksButton
                    }
                  >
                    CC
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        {showTrackPicker && (
          <TrackPicker
            audioTracks={audioTracks}
            subtitles={subtitles}
            selectedAudioTrack={selectedAudioTrack}
            selectedSubtitle={selectedSubtitle}
            onSelectAudio={onSelectAudio}
            onSelectSubtitle={onSelectSubtitle}
            onClose={handleCloseTracks}
          />
        )}
      </div>
    </FocusContext.Provider>
  );
});
