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
}

interface TrackItemProps {
  label: string;
  focusKey: string;
  selected: boolean;
  trackId: number | null;
  onPress: (id: number | null) => void;
}

const TrackItem = memo(function TrackItem({
  label,
  focusKey: itemFocusKey,
  selected,
  trackId,
  onPress,
}: TrackItemProps): ReactElement {
  const handlePress = useCallback((): void => {
    onPress(trackId);
  }, [onPress, trackId]);

  const { ref, focused } = useFocusable({
    onEnterPress: handlePress,
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

  const handleSelectAudio = useCallback(
    (id: number | null): void => {
      if (id !== null) {
        onSelectAudio(id);
      }
    },
    [onSelectAudio],
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
                  trackId={track.id}
                  onPress={handleSelectAudio}
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
                trackId={null}
                onPress={onSelectSubtitle}
              />
              {subtitles.map((sub, index) => (
                <TrackItem
                  key={'sub-' + index}
                  label={sub.lang || 'Subtitle ' + (index + 1)}
                  focusKey={'track-sub-' + index}
                  selected={selectedSubtitle === index}
                  trackId={index}
                  onPress={onSelectSubtitle}
                />
              ))}
            </div>
          )}
        </div>
      </FocusContext.Provider>
    </div>
  );
});
