import {
  ReactElement,
  memo,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import {
  useFocusable,
  FocusContext,
  setFocus,
} from '@noriginmedia/norigin-spatial-navigation';
import { EpisodeList } from '../components/EpisodeList';
import { NetworkError } from '../components/NetworkError';
import { useBackKey } from '../hooks/useBackKey';
import { getItemDetail } from '../api/content';
import { getFolders, addItem, removeItem } from '../api/bookmarks';
import { toggleWatchlist } from '../api/watching';
import { useUiStore } from '../store/ui';
import { formatDuration } from '../utils/formatDuration';
import type { ItemDetails, ItemType, Video, BookmarkFolder, Season } from '../types';
import styles from './ContentPage.module.css';

interface ResumePoint {
  seasonIndex: number;
  episodeIndex: number;
  time: number;
}

function findResumePoint(seasons: ReadonlyArray<Season>): ResumePoint | null {
  for (let si = 0; si < seasons.length; si++) {
    const eps = seasons[si].episodes;
    for (let ei = 0; ei < eps.length; ei++) {
      if (eps[ei].watched === 0) {
        return { seasonIndex: si, episodeIndex: ei, time: eps[ei].watching.time };
      }
    }
  }
  let hasAnyWatched = false;
  for (let si = seasons.length - 1; si >= 0; si--) {
    const eps = seasons[si].episodes;
    for (let ei = eps.length - 1; ei >= 0; ei--) {
      if (eps[ei].watched === 1) {
        hasAnyWatched = true;
        const nextEi = ei + 1;
        if (nextEi < eps.length) {
          return { seasonIndex: si, episodeIndex: nextEi, time: 0 };
        }
        if (si + 1 < seasons.length) {
          return { seasonIndex: si + 1, episodeIndex: 0, time: 0 };
        }
        return null;
      }
    }
  }
  if (!hasAnyWatched && seasons.length > 0 && seasons[0].episodes.length > 0) {
    return { seasonIndex: 0, episodeIndex: 0, time: 0 };
  }
  return null;
}

function getResumeLabel(point: ResumePoint | null): string {
  if (point === null) return 'Play';
  if (point.time > 0) return 'Resume';
  return 'Play';
}

interface EpisodePosition {
  seasonIndex: number;
  episodeIndex: number;
}

function findEpisodePosition(seasons: ReadonlyArray<Season>, episodeId: number): EpisodePosition | null {
  for (let si = 0; si < seasons.length; si++) {
    const eps = seasons[si].episodes;
    for (let ei = 0; ei < eps.length; ei++) {
      if (eps[ei].id === episodeId) {
        return { seasonIndex: si, episodeIndex: ei };
      }
    }
  }
  return null;
}

type ContentKind = 'movie' | 'serial';

function classifyType(type: ItemType): ContentKind {
  switch (type) {
    case 'movie':
    case 'concert':
    case 'documovie':
    case '3d':
      return 'movie';
    case 'serial':
    case 'tvshow':
    case 'docuserial':
      return 'serial';
    default: {
      const _exhaustive: never = type;
      throw new Error('Unhandled item type: ' + _exhaustive);
    }
  }
}

function hasRatings(item: ItemDetails): boolean {
  return item.kinopoisk_rating > 0 || item.imdb_rating > 0;
}

export const ContentPage = memo(function ContentPage(): ReactElement {
  const contentId = useUiStore((s) => s.screenParams.contentId);
  const navigateWithFocus = useUiStore((s) => s.navigateWithFocus);
  const goBack = useUiStore((s) => s.goBack);

  const [item, setItem] = useState<ItemDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [bookmarkFolders, setBookmarkFolders] = useState<ReadonlyArray<BookmarkFolder>>([]);

  const [focusRestorePosition, setFocusRestorePosition] = useState<EpisodePosition | null>(null);
  const pendingFocusRef = useRef<string | null>(null);

  const bookmarked = item !== null && item.bookmarks.length > 0;

  const { ref, focusKey } = useFocusable({
    trackChildren: true,
    saveLastFocusedChild: true,
    focusKey: 'content-page',
  });

  const fetchContent = useCallback(async (): Promise<void> => {
    if (contentId === undefined) {
      setError(new Error('No content ID provided'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [detailResponse, foldersResponse] = await Promise.all([
        getItemDetail(contentId),
        getFolders(),
      ]);

      setItem(detailResponse.item);
      setBookmarkFolders(foldersResponse.items);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load content'));
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  useEffect(() => {
    if (item !== null && !loading) {
      const pendingFocusKey = useUiStore.getState().lastRestoredFocusKey;
      if (pendingFocusKey !== null) {
        useUiStore.getState().clearLastRestoredFocusKey();

        if (pendingFocusKey.startsWith('episode-') && item.seasons) {
          const episodeId = parseInt(pendingFocusKey.slice(8), 10);
          if (!isNaN(episodeId)) {
            const position = findEpisodePosition(item.seasons, episodeId);
            if (position !== null) {
              pendingFocusRef.current = pendingFocusKey;
              setFocusRestorePosition(position);
              return;
            }
          }
        }

        requestAnimationFrame(() => {
          setFocus(pendingFocusKey);
        });
        return;
      }
      const kind = classifyType(item.type);
      const seasons = item.seasons;
      const hasResumePoint = kind === 'serial' && seasons !== undefined
        ? findResumePoint(seasons) !== null
        : false;
      const focusTarget = kind === 'movie' || (kind === 'serial' && hasResumePoint)
        ? 'content-play-button'
        : 'episode-list';
      requestAnimationFrame(() => {
        setFocus(focusTarget);
      });
    }
  }, [item, loading]);

  useEffect(() => {
    if (focusRestorePosition !== null && pendingFocusRef.current !== null) {
      const key = pendingFocusRef.current;
      pendingFocusRef.current = null;
      requestAnimationFrame(() => {
        setFocus(key);
      });
    }
  }, [focusRestorePosition]);

  const handlePlay = useCallback((): void => {
    if (item === null) return;
    const kind = classifyType(item.type);

    if (kind === 'movie' && item.videos && item.videos.length > 0) {
      const video = item.videos[0];
      const movieResumeTime = video.watched !== 1 && video.watching.time > 0 ? video.watching.time : 0;
      navigateWithFocus('player', { params: { contentId: item.id, mediaId: video.id, title: item.title, resumeTime: movieResumeTime, alreadyWatched: video.watched === 1 } });
    }
  }, [item, navigateWithFocus]);

  const handleResumeSerial = useCallback((): void => {
    if (item === null || !item.seasons) return;
    const point = findResumePoint(item.seasons);
    const target = point !== null
      ? item.seasons[point.seasonIndex].episodes[point.episodeIndex]
      : item.seasons[0]?.episodes[0];
    if (target === undefined) return;
    const episodeTitle = item.title + ' S' + target.snumber + 'E' + target.number;
    const resumeTime = target.watched !== 1 && target.watching.time > 0
      ? target.watching.time
      : 0;
    navigateWithFocus('player', {
      params: {
        contentId: item.id,
        mediaId: target.id,
        seasonNumber: target.snumber,
        episodeNumber: target.number,
        title: episodeTitle,
        resumeTime,
        alreadyWatched: target.watched === 1,
      },
    });
  }, [item, navigateWithFocus]);

  const handleSelectEpisode = useCallback(
    (episode: Video): void => {
      if (item === null) return;
      const episodeTitle = item.title + ' S' + episode.snumber + 'E' + episode.number;
      const resumeTime = episode.watched !== 1 && episode.watching.time > 0 ? episode.watching.time : 0;
      navigateWithFocus('player', {
        params: {
          contentId: item.id,
          mediaId: episode.id,
          seasonNumber: episode.snumber,
          episodeNumber: episode.number,
          title: episodeTitle,
          resumeTime,
          alreadyWatched: episode.watched === 1,
        },
      });
    },
    [item, navigateWithFocus],
  );

  const handleBookmarkToggle = useCallback((): void => {
    if (item === null) return;

    const toggle = async (): Promise<void> => {
      if (bookmarked && item.bookmarks.length > 0) {
        const firstBookmark = item.bookmarks[0];
        await removeItem(item.id, firstBookmark.id);
        setItem((prev) => {
          if (prev === null) return prev;
          return {
            ...prev,
            bookmarks: prev.bookmarks.filter((b) => b.id !== firstBookmark.id),
          };
        });
      } else if (bookmarkFolders.length > 0) {
        const defaultFolder = bookmarkFolders[0];
        await addItem(item.id, defaultFolder.id);
        setItem((prev) => {
          if (prev === null) return prev;
          return {
            ...prev,
            bookmarks: [...prev.bookmarks, { id: defaultFolder.id, title: defaultFolder.title }],
          };
        });
      }
    };

    toggle().catch((err: unknown) => {
      setError(err instanceof Error ? err : new Error('Bookmark operation failed'));
    });
  }, [item, bookmarked, bookmarkFolders]);

  const handleSubscribeToggle = useCallback((): void => {
    if (item === null) return;

    toggleWatchlist(item.id)
      .then(() => {
        setItem((prev) => {
          if (prev === null) return prev;
          return {
            ...prev,
            subscribed: !prev.subscribed,
            in_watchlist: !prev.in_watchlist,
          };
        });
      })
      .catch(() => {});
  }, [item]);

  useBackKey(goBack);

  if (error) {
    return <NetworkError message={error.message} onRetry={fetchContent} />;
  }

  if (loading || item === null) {
    return <ContentSkeleton />;
  }

  const kind = classifyType(item.type);
  const resumePoint = kind === 'serial' && item.seasons ? findResumePoint(item.seasons) : null;
  const showRatings = hasRatings(item);
  const genreText = item.genres.map((g) => g.title).join(', ');
  const countryText = item.countries.map((c) => c.title).join(', ');
  const posterUrl = item.posters.big || item.posters.medium || item.posters.small;

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className={styles.container}>
        <div className={styles.scrollable}>
          <div className={styles.hero}>
            <PosterImage posterUrl={posterUrl} title={item.title} />
            <div className={styles.info}>
              <div className={styles.title}>{item.title}</div>
              <div className={styles.meta}>
                <span className={styles.metaItem}>{item.year}</span>
                {countryText && (
                  <span className={styles.metaItem}>{countryText}</span>
                )}
                {item.duration.average > 0 && (
                  <span className={styles.metaItem}>
                    {formatDuration(item.duration.average)}
                  </span>
                )}
                {showRatings && (
                  <span className={styles.metaItem}>
                    {item.kinopoisk_rating > 0 && (
                      <span className={styles.ratingKp}>
                        KP {item.kinopoisk_rating.toFixed(1)}
                      </span>
                    )}
                    {item.kinopoisk_rating > 0 && item.imdb_rating > 0 && '  '}
                    {item.imdb_rating > 0 && (
                      <span className={styles.ratingImdb}>
                        IMDb {item.imdb_rating.toFixed(1)}
                      </span>
                    )}
                  </span>
                )}
              </div>
              {genreText && <div className={styles.genres}>{genreText}</div>}
              {item.plot && <div className={styles.plot}>{item.plot}</div>}
              {item.director && (
                <div className={styles.castInfo}>
                  <span className={styles.castLabel}>Director: </span>
                  {item.director}
                </div>
              )}
              {item.cast && (
                <div className={styles.castInfo}>
                  <span className={styles.castLabel}>Cast: </span>
                  {item.cast}
                </div>
              )}
              <div className={styles.actions}>
                {kind === 'movie' && (
                  <ActionButton
                    label="Play"
                    focusKey="content-play-button"
                    onPress={handlePlay}
                    active={false}
                  />
                )}
                {kind === 'serial' && item.seasons && item.seasons.length > 0 && (
                  <ActionButton
                    label={getResumeLabel(resumePoint)}
                    focusKey="content-play-button"
                    onPress={handleResumeSerial}
                    active={false}
                  />
                )}
                <ActionButton
                  label={item.subscribed ? 'Subscribed' : 'Subscribe'}
                  focusKey="content-subscribe-button"
                  onPress={handleSubscribeToggle}
                  active={item.subscribed}
                />
                <ActionButton
                  label={bookmarked ? 'Bookmarked' : 'Bookmark'}
                  focusKey="content-bookmark-button"
                  onPress={handleBookmarkToggle}
                  active={bookmarked}
                />
              </div>
            </div>
          </div>
          {kind === 'serial' && item.seasons && item.seasons.length > 0 && (
            <EpisodeList
              seasons={item.seasons}
              onSelectEpisode={handleSelectEpisode}
              initialSeasonIndex={focusRestorePosition?.seasonIndex ?? resumePoint?.seasonIndex}
              initialEpisodeIndex={focusRestorePosition?.episodeIndex ?? resumePoint?.episodeIndex}
            />
          )}
        </div>
      </div>
    </FocusContext.Provider>
  );
});

interface PosterImageProps {
  posterUrl: string;
  title: string;
}

const PosterImage = memo(function PosterImage({
  posterUrl,
  title,
}: PosterImageProps): ReactElement {
  const [loaded, setLoaded] = useState(false);

  const handleLoad = useCallback((): void => {
    setLoaded(true);
  }, []);

  const imageClass = loaded
    ? styles.poster + ' ' + styles.posterLoaded
    : styles.poster;

  return (
    <div className={styles.posterContainer}>
      {!loaded && <div className={styles.posterPlaceholder} />}
      {posterUrl && (
        <img
          className={imageClass}
          src={posterUrl}
          alt={title}
          width={300}
          height={450}
          onLoad={handleLoad}
        />
      )}
    </div>
  );
});

interface ActionButtonProps {
  label: string;
  focusKey: string;
  onPress: () => void;
  active: boolean;
}

const ActionButton = memo(function ActionButton({
  label,
  focusKey: buttonFocusKey,
  onPress,
  active,
}: ActionButtonProps): ReactElement {
  const { ref, focused } = useFocusable({
    onEnterPress: onPress,
    focusKey: buttonFocusKey,
  });

  let buttonClass = focused ? styles.actionButtonFocused : styles.actionButton;
  if (active && !focused) {
    buttonClass = styles.actionButton + ' ' + styles.bookmarkActive;
  }

  return (
    <div ref={ref} className={buttonClass}>
      {label}
    </div>
  );
});

const ContentSkeleton = memo(function ContentSkeleton(): ReactElement {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.skeletonPoster} />
      <div className={styles.skeletonInfo}>
        <div className={styles.skeletonTitle} />
        <div className={styles.skeletonMeta} />
        <div className={styles.skeletonPlot} />
        <div className={styles.skeletonButton} />
      </div>
    </div>
  );
});
