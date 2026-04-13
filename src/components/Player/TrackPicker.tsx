import { ReactElement, memo, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  useFocusable,
  FocusContext,
  setFocus,
} from '@noriginmedia/norigin-spatial-navigation';
import type { HlsAudioTrack } from '../../contexts/PlayerContext';
import type { Subtitle } from '../../types';
import styles from './TrackPicker.module.css';

const PREFERRED_LANGS = ['eng', 'en'];

function langSortKey(lang: string): number {
  const idx = PREFERRED_LANGS.indexOf(lang.toLowerCase());
  return idx === -1 ? PREFERRED_LANGS.length : idx;
}

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

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (focused && scrollRef.current !== null) {
      scrollRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [focused]);

  let itemClass = styles.item;
  if (focused) {
    itemClass = styles.itemFocused;
  } else if (selected) {
    itemClass = styles.itemSelected;
  }

  return (
    <div ref={ref} className={itemClass}>
      <div ref={scrollRef}>
        {selected && <span className={styles.checkmark}>&#10003;</span>}
        <span className={styles.label}>{label}</span>
      </div>
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

  const sortedAudio = useMemo(
    () => [...audioTracks].sort((a, b) => langSortKey(a.lang) - langSortKey(b.lang)),
    [audioTracks],
  );

  const sortedSubs = useMemo(
    () => subtitles.map((sub, index) => ({ sub, originalIndex: index }))
      .sort((a, b) => langSortKey(a.sub.lang) - langSortKey(b.sub.lang)),
    [subtitles],
  );

  const initialSubtitle = useRef(selectedSubtitle);
  const initialAudio = useRef(selectedAudioTrack);
  const initialSortedAudio = useRef(sortedAudio);
  const initialSubsLen = useRef(subtitles.length);

  useEffect(() => {
    requestAnimationFrame(() => {
      if (initialSubtitle.current !== null) {
        setFocus('track-sub-' + initialSubtitle.current);
      } else if (initialSubsLen.current > 0) {
        setFocus('track-sub-off');
      } else if (initialAudio.current !== null) {
        setFocus('track-audio-' + initialAudio.current);
      } else if (initialSortedAudio.current.length > 0) {
        setFocus('track-audio-' + initialSortedAudio.current[0].id);
      }
    });
  }, []);

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
          {sortedAudio.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Audio</div>
              {sortedAudio.map((track) => (
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
          {sortedSubs.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Subtitles</div>
              <TrackItem
                label="Off"
                focusKey="track-sub-off"
                selected={selectedSubtitle === null}
                trackId={null}
                onPress={onSelectSubtitle}
              />
              {sortedSubs.map(({ sub, originalIndex }) => (
                <TrackItem
                  key={'sub-' + originalIndex}
                  label={sub.lang || 'Subtitle ' + (originalIndex + 1)}
                  focusKey={'track-sub-' + originalIndex}
                  selected={selectedSubtitle === originalIndex}
                  trackId={originalIndex}
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
