import {
  ReactElement,
  memo,
  useState,
  useCallback,
  useEffect,
  useRef,
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
  onBack: () => void;
  onSelectAudio: (id: number) => void;
  onSelectSubtitle: (index: number | null) => void;
}

type FocusedElement = 'progress' | 'playPause' | 'tracks';

const AUTO_HIDE_MS = 5000;
const PROGRESS_FOCUS_KEY = 'player-overlay-progress';
const PLAY_PAUSE_FOCUS_KEY = 'player-overlay-play-pause';
const TRACKS_FOCUS_KEY = 'player-overlay-tracks-btn';

function handleTracksArrow(direction: string): boolean {
  if (direction === 'up') {
    setFocus(PROGRESS_FOCUS_KEY);
    return false;
  }
  if (direction === 'left') {
    setFocus(PLAY_PAUSE_FOCUS_KEY);
    return false;
  }
  return true;
}

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
  onBack,
  onSelectAudio,
  onSelectSubtitle,
}: PlayerOverlayProps): ReactElement | null {
  const [visible, setVisible] = useState(true);
  const [showTrackPicker, setShowTrackPicker] = useState(false);
  const [focusedElement, setFocusedElement] = useState<FocusedElement>('progress');
  const hideTimerRef = useRef<number | null>(null);
  const showTrackPickerRef = useRef(showTrackPicker);
  showTrackPickerRef.current = showTrackPicker;
  const prevVisibleRef = useRef(false);

  const resetHideTimer = useCallback((): void => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      if (!showTrackPickerRef.current) {
        setVisible(false);
      }
    }, AUTO_HIDE_MS);
  }, []);

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
    const handleAnyKey = (event: KeyboardEvent): void => {
      const isBack =
        event.keyCode === 10009 ||
        event.keyCode === 8 ||
        event.key === 'Backspace' ||
        event.key === 'Escape';
      if (isBack) return;
      if (!visible) {
        showOverlay();
      } else {
        resetHideTimer();
      }
    };

    window.addEventListener('keydown', handleAnyKey, true);
    return () => {
      window.removeEventListener('keydown', handleAnyKey, true);
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
      setFocus(TRACKS_FOCUS_KEY);
    });
  }, [resetHideTimer]);

  useEffect(() => {
    const handleBackKey = (event: KeyboardEvent): void => {
      const isBack =
        event.keyCode === 10009 ||
        event.keyCode === 8 ||
        event.key === 'Backspace' ||
        event.key === 'Escape';
      if (!isBack) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      if (showTrackPickerRef.current) {
        handleCloseTracks();
      } else {
        onBack();
      }
    };
    window.addEventListener('keydown', handleBackKey, true);
    return () => {
      window.removeEventListener('keydown', handleBackKey, true);
    };
  }, [handleCloseTracks, onBack]);

  const { ref: overlayRef, focusKey: overlayFocusKey } = useFocusable({
    trackChildren: true,
    saveLastFocusedChild: true,
    focusKey: 'player-overlay',
    isFocusBoundary: true,
  });

  const handleProgressFocus = useCallback((): void => {
    setFocusedElement('progress');
  }, []);

  const handlePlayPauseFocus = useCallback((): void => {
    setFocusedElement('playPause');
  }, []);

  const handleTracksBtnFocus = useCallback((): void => {
    setFocusedElement('tracks');
  }, []);

  const handleProgressArrow = useCallback((direction: string): boolean => {
    if (direction === 'down') {
      setFocus(PLAY_PAUSE_FOCUS_KEY);
      return false;
    }
    return true;
  }, []);

  const hasExtraTracks = audioTracks.length > 1 || subtitles.length > 0;

  const handlePlayPauseArrow = useCallback((direction: string): boolean => {
    if (direction === 'up') {
      setFocus(PROGRESS_FOCUS_KEY);
      return false;
    }
    if (direction === 'right' && hasExtraTracks) {
      setFocus(TRACKS_FOCUS_KEY);
      return false;
    }
    return true;
  }, [hasExtraTracks]);

  const { ref: progressRef } = useFocusable({
    focusKey: PROGRESS_FOCUS_KEY,
    onFocus: handleProgressFocus,
    onArrowPress: handleProgressArrow,
    onEnterPress: onPlayPause,
  });

  const { ref: playPauseRef } = useFocusable({
    onEnterPress: onPlayPause,
    focusKey: PLAY_PAUSE_FOCUS_KEY,
    onFocus: handlePlayPauseFocus,
    onArrowPress: handlePlayPauseArrow,
  });

  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      requestAnimationFrame(() => {
        setFocus(PROGRESS_FOCUS_KEY);
      });
    }
    prevVisibleRef.current = visible;
  }, [visible]);

  const playPauseIcon = isPlaying ? '\u275A\u275A' : '\u25B6';

  if (!visible && !showTrackPicker) {
    return <></>;
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
              <div ref={progressRef} className={styles.progressRow}>
                <ProgressBar
                  currentTime={currentTime}
                  duration={duration}
                  buffered={buffered}
                  onSeek={onSeek}
                  focused={focusedElement === 'progress'}
                />
              </div>
              <div className={styles.buttonRow}>
                <div
                  ref={playPauseRef}
                  className={
                    focusedElement === 'playPause'
                      ? styles.transportButton + ' ' + styles.buttonFocused
                      : styles.transportButton
                  }
                >
                  {playPauseIcon}
                </div>
                {hasExtraTracks && (
                  <TracksButton
                    focused={focusedElement === 'tracks'}
                    onOpen={handleOpenTracks}
                    onFocus={handleTracksBtnFocus}
                  />
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
          />
        )}
      </div>
    </FocusContext.Provider>
  );
});

interface TracksButtonProps {
  focused: boolean;
  onOpen: () => void;
  onFocus: () => void;
}

const TracksButton = memo(function TracksButton({
  focused,
  onOpen,
  onFocus,
}: TracksButtonProps): ReactElement {
  const { ref } = useFocusable({
    onEnterPress: onOpen,
    focusKey: TRACKS_FOCUS_KEY,
    onFocus,
    onArrowPress: handleTracksArrow,
  });

  return (
    <div
      ref={ref}
      className={
        focused
          ? styles.tracksButton + ' ' + styles.buttonFocused
          : styles.tracksButton
      }
    >
      CC
    </div>
  );
});
