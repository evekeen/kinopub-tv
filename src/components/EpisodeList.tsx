import {
  ReactElement,
  memo,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  useFocusable,
  FocusContext,
  setFocus,
} from '@noriginmedia/norigin-spatial-navigation';
import { formatDuration } from '../utils/formatDuration';
import type { Season, Video, WatchingStatus } from '../types';
import styles from './EpisodeList.module.css';

const VISIBLE_EPISODE_BUFFER = 5;
const EPISODE_ROW_HEIGHT = 118;

function getWatchedClass(status: WatchingStatus): string {
  switch (status) {
    case 1:
      return styles.watchedDone;
    case 0:
      return styles.watchedPartial;
    case -1:
      return styles.watchedNone;
    default: {
      const _exhaustive: never = status;
      throw new Error('Unhandled watching status: ' + _exhaustive);
    }
  }
}

interface EpisodeListProps {
  seasons: ReadonlyArray<Season>;
  onSelectEpisode: (episode: Video) => void;
  initialSeasonIndex?: number;
  initialEpisodeIndex?: number;
}

export const EpisodeList = memo(function EpisodeList({
  seasons,
  onSelectEpisode,
  initialSeasonIndex,
  initialEpisodeIndex,
}: EpisodeListProps): ReactElement {
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState(initialSeasonIndex ?? 0);
  const [focusedEpisodeIndex, setFocusedEpisodeIndex] = useState(initialEpisodeIndex ?? 0);

  const currentSeason = seasons[selectedSeasonIndex];
  const episodes = useMemo(
    () => (currentSeason ? currentSeason.episodes : []),
    [currentSeason],
  );

  const initialEpisodeFocusKey = episodes.length > focusedEpisodeIndex
    ? 'episode-' + episodes[focusedEpisodeIndex].id
    : undefined;

  const { ref, focusKey } = useFocusable({
    trackChildren: true,
    saveLastFocusedChild: true,
    focusKey: 'episode-list',
    preferredChildFocusKey: initialEpisodeFocusKey,
  });

  const handleSelectSeason = useCallback(
    (index: number): void => {
      setSelectedSeasonIndex(index);
      setFocusedEpisodeIndex(0);
      const targetSeason = seasons[index];
      if (targetSeason && targetSeason.episodes.length > 0) {
        requestAnimationFrame(() => {
          setFocus('episode-' + targetSeason.episodes[0].id);
        });
      }
    },
    [seasons],
  );

  const handleEpisodeFocus = useCallback(
    (_episode: Video, index: number): void => {
      setFocusedEpisodeIndex(index);
    },
    [],
  );

  const visibleRange = useMemo(() => {
    const start = Math.max(0, focusedEpisodeIndex - VISIBLE_EPISODE_BUFFER);
    const end = Math.min(episodes.length - 1, focusedEpisodeIndex + VISIBLE_EPISODE_BUFFER);
    return { start, end };
  }, [focusedEpisodeIndex, episodes.length]);

  const translateY = useMemo(() => {
    if (focusedEpisodeIndex <= 2) return 0;
    return -((focusedEpisodeIndex - 2) * EPISODE_ROW_HEIGHT);
  }, [focusedEpisodeIndex]);

  const trackStyle = useMemo(
    () => ({
      transform: 'translateY(' + translateY + 'px)',
    }),
    [translateY],
  );

  const spacerStyle = useMemo(
    () => ({
      height: visibleRange.start * EPISODE_ROW_HEIGHT + 'px',
      flexShrink: 0 as const,
    }),
    [visibleRange.start],
  );

  const visibleEpisodes = useMemo(() => {
    const result: ReactElement[] = [];
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      const episode = episodes[i];
      result.push(
        <EpisodeRowWithIndex
          key={episode.id}
          episode={episode}
          index={i}
          onSelect={onSelectEpisode}
          onFocus={handleEpisodeFocus}
        />,
      );
    }
    return result;
  }, [visibleRange, episodes, onSelectEpisode, handleEpisodeFocus]);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className={styles.container}>
        {seasons.length > 1 && (
          <SeasonTabs
            seasons={seasons}
            selectedIndex={selectedSeasonIndex}
            onSelectSeason={handleSelectSeason}
          />
        )}
        <div className={styles.episodesViewport}>
          <div className={styles.episodes} style={trackStyle}>
            {visibleRange.start > 0 && <div style={spacerStyle} />}
            {visibleEpisodes}
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
});

interface SeasonTabsProps {
  seasons: ReadonlyArray<Season>;
  selectedIndex: number;
  onSelectSeason: (index: number) => void;
}

const SeasonTabs = memo(function SeasonTabs({
  seasons,
  selectedIndex,
  onSelectSeason,
}: SeasonTabsProps): ReactElement {
  return (
    <div className={styles.seasonTabs}>
      {seasons.map((season, index) => (
        <SeasonTab
          key={season.id}
          season={season}
          index={index}
          isSelected={index === selectedIndex}
          onSelect={onSelectSeason}
        />
      ))}
    </div>
  );
});

interface SeasonTabProps {
  season: Season;
  index: number;
  isSelected: boolean;
  onSelect: (index: number) => void;
}

const SeasonTab = memo(function SeasonTab({
  season,
  index,
  isSelected,
  onSelect,
}: SeasonTabProps): ReactElement {
  const handleEnterPress = useCallback((): void => {
    onSelect(index);
  }, [onSelect, index]);

  const { ref, focused } = useFocusable({
    onEnterPress: handleEnterPress,
    focusKey: 'season-tab-' + season.number,
  });

  const tabClass = focused
    ? styles.seasonTabFocused
    : isSelected
      ? styles.seasonTabActive
      : styles.seasonTab;

  const label = season.title || ('Season ' + season.number);

  return (
    <div ref={ref} className={tabClass}>
      {label}
    </div>
  );
});

interface EpisodeRowWithIndexProps {
  episode: Video;
  index: number;
  onSelect: (episode: Video) => void;
  onFocus: (episode: Video, index: number) => void;
}

const EpisodeRowWithIndex = memo(function EpisodeRowWithIndex({
  episode,
  index,
  onSelect,
  onFocus,
}: EpisodeRowWithIndexProps): ReactElement {
  const handleFocus = useCallback((): void => {
    onFocus(episode, index);
  }, [onFocus, episode, index]);

  return (
    <EpisodeRow
      episode={episode}
      onSelect={onSelect}
      onFocus={handleFocus}
    />
  );
});

interface EpisodeRowProps {
  episode: Video;
  onSelect: (episode: Video) => void;
  onFocus: () => void;
}

const EpisodeRow = memo(function EpisodeRow({
  episode,
  onSelect,
  onFocus,
}: EpisodeRowProps): ReactElement {
  const handleEnterPress = useCallback((): void => {
    onSelect(episode);
  }, [onSelect, episode]);

  const { ref, focused } = useFocusable({
    onEnterPress: handleEnterPress,
    onFocus,
    focusKey: 'episode-' + episode.id,
  });

  const rowClass = focused ? styles.episodeRowFocused : styles.episodeRow;
  const titleClass = focused ? styles.episodeTitleFocused : styles.episodeTitle;
  const watchedClass = getWatchedClass(episode.watched);

  return (
    <div ref={ref} className={rowClass}>
      {episode.thumbnail && (
        <div className={styles.episodeThumbnail}>
          <img
            src={episode.thumbnail}
            alt={episode.title}
            width={160}
            height={90}
          />
        </div>
      )}
      <div className={styles.episodeInfo}>
        <div className={styles.episodeNumber}>
          Episode {episode.number}
        </div>
        <div className={titleClass}>
          {episode.title || ('Episode ' + episode.number)}
        </div>
        {episode.duration > 0 && (
          <div className={styles.episodeDuration}>
            {formatDuration(episode.duration)}
          </div>
        )}
      </div>
      <div className={watchedClass} />
    </div>
  );
});
