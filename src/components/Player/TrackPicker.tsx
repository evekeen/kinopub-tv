import { ReactElement, memo, useCallback, useEffect } from 'react';
import {
  useFocusable,
  FocusContext,
  setFocus,
} from '@noriginmedia/norigin-spatial-navigation';
import type { HlsAudioTrack } from '../../contexts/PlayerContext';
import type { Subtitle } from '../../types';
import styles from './TrackPicker.module.css';

interface TrackPickerProps {
  audioTracks: HlsAudioTrack[];
  subtitles: Subtitle[];
  selectedAudioTrack: number | null;
  selectedSubtitle: number | null;
  onSelectAudio: (id: number) => void;
  onSelectSubtitle: (index: number | null) => void;
  onClose: () => void;
}

interface TrackItemProps {
  label: string;
  focusKey: string;
  selected: boolean;
  onPress: () => void;
}

const TrackItem = memo(function TrackItem({
  label,
  focusKey: itemFocusKey,
  selected,
  onPress,
}: TrackItemProps): ReactElement {
  const { ref, focused } = useFocusable({
    onEnterPress: onPress,
    focusKey: itemFocusKey,
  });

  let itemClass = styles.item;
  if (focused) {
    itemClass = styles.itemFocused;
  } else if (selected) {
    itemClass = styles.itemSelected;
  }

  return (
    <div ref={ref} className={itemClass}>
      {selected && <span className={styles.checkmark}>&#10003;</span>}
      <span className={styles.label}>{label}</span>
    </div>
  );
});

export const TrackPicker = memo(function TrackPicker({
  audioTracks,
  subtitles,
  selectedAudioTrack,
  selectedSubtitle,
  onSelectAudio,
  onSelectSubtitle,
  onClose,
}: TrackPickerProps): ReactElement {
  const { ref, focusKey } = useFocusable({
    trackChildren: true,
    saveLastFocusedChild: true,
    focusKey: 'track-picker',
    isFocusBoundary: true,
  });

  useEffect(() => {
    requestAnimationFrame(() => {
      if (audioTracks.length > 0) {
        setFocus('track-audio-0');
      } else if (subtitles.length > 0) {
        setFocus('track-sub-0');
      }
    });
  }, [audioTracks.length, subtitles.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (
        event.keyCode === 10009 ||
        event.keyCode === 8 ||
        event.key === 'Backspace' ||
        event.key === 'Escape'
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onClose]);

  const handleSelectAudio = useCallback(
    (id: number) => (): void => {
      onSelectAudio(id);
    },
    [onSelectAudio],
  );

  const handleSelectSubtitle = useCallback(
    (index: number | null) => (): void => {
      onSelectSubtitle(index);
    },
    [onSelectSubtitle],
  );

  return (
    <div className={styles.overlay}>
      <FocusContext.Provider value={focusKey}>
        <div ref={ref} className={styles.container}>
          {audioTracks.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Audio</div>
              {audioTracks.map((track) => (
                <TrackItem
                  key={'audio-' + track.id}
                  label={track.name + (track.lang ? ' (' + track.lang + ')' : '')}
                  focusKey={'track-audio-' + track.id}
                  selected={selectedAudioTrack === track.id}
                  onPress={handleSelectAudio(track.id)}
                />
              ))}
            </div>
          )}
          {subtitles.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Subtitles</div>
              <TrackItem
                label="Off"
                focusKey="track-sub-off"
                selected={selectedSubtitle === null}
                onPress={handleSelectSubtitle(null)}
              />
              {subtitles.map((sub, index) => (
                <TrackItem
                  key={'sub-' + index}
                  label={sub.lang || 'Subtitle ' + (index + 1)}
                  focusKey={'track-sub-' + index}
                  selected={selectedSubtitle === index}
                  onPress={handleSelectSubtitle(index)}
                />
              ))}
            </div>
          )}
        </div>
      </FocusContext.Provider>
    </div>
  );
});
