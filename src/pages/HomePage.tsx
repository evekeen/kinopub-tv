import {
  ReactElement,
  memo,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  useFocusable,
  FocusContext,
  setFocus,
} from '@noriginmedia/norigin-spatial-navigation';
import { ContentRail } from '../components/ContentRail';
import { PosterSkeleton } from '../components/LoadingSkeleton';
import { NetworkError } from '../components/NetworkError';
import { getFresh, getHot, getPopular } from '../api/content';
import { getWatchingSerials, getWatchingMovies } from '../api/watching';
import { useUiStore } from '../store/ui';
import { useAuthStore } from '../store/auth';
import type { Item } from '../types';
import styles from './HomePage.module.css';

interface RailData {
  title: string;
  items: ReadonlyArray<Item>;
  focusKey: string;
}

const RAIL_HEIGHT = 510;
const VISIBLE_RAIL_BUFFER = 1;
const PLACEHOLDER_STYLE = { height: RAIL_HEIGHT + 'px' } as const;

export function HomePage(): ReactElement {
  const [rails, setRails] = useState<ReadonlyArray<RailData>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [focusedRailIndex, setFocusedRailIndex] = useState(0);
  const rafRef = useRef<number | null>(null);

  const navigate = useUiStore((s) => s.navigate);
  const setLastFocusKey = useUiStore((s) => s.setLastFocusKey);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { ref, focusKey } = useFocusable({
    trackChildren: true,
    saveLastFocusedChild: true,
    focusKey: 'home-page',
  });

  const fetchContent = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all([
        getWatchingSerials().catch(() => null),
        getWatchingMovies().catch(() => null),
        getFresh().catch(() => null),
        getHot().catch(() => null),
        getPopular().catch(() => null),
      ]);

      const [watchingSerials, watchingMovies, fresh, hot, popular] = results;

      const newRails: RailData[] = [];

      const continueWatchingItems: Item[] = [];
      if (watchingSerials?.items) {
        continueWatchingItems.push(...watchingSerials.items);
      }
      if (watchingMovies?.items) {
        continueWatchingItems.push(...watchingMovies.items);
      }

      if (continueWatchingItems.length > 0) {
        newRails.push({
          title: 'Continue Watching',
          items: continueWatchingItems,
          focusKey: 'rail-continue',
        });
      }

      if (fresh !== null && fresh.items.length > 0) {
        newRails.push({
          title: 'Fresh',
          items: fresh.items,
          focusKey: 'rail-fresh',
        });
      }

      if (hot !== null && hot.items.length > 0) {
        newRails.push({
          title: 'Hot',
          items: hot.items,
          focusKey: 'rail-hot',
        });
      }

      if (popular !== null && popular.items.length > 0) {
        newRails.push({
          title: 'Popular',
          items: popular.items,
          focusKey: 'rail-popular',
        });
      }

      if (newRails.length === 0) {
        setError(new Error('No content available'));
        return;
      }

      setRails(newRails);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load content'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchContent();
    }
  }, [fetchContent, isAuthenticated]);

  useEffect(() => {
    if (rails.length > 0) {
      rafRef.current = requestAnimationFrame(() => {
        setFocus(rails[0].focusKey);
      });
    }
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [rails]);

  const handleSelectItem = useCallback(
    (item: Item): void => {
      setLastFocusKey('home-page');
      navigate('content', { contentId: item.id });
    },
    [navigate, setLastFocusKey],
  );

  const handleRailFocus = useCallback((index: number): void => {
    setFocusedRailIndex(index);
  }, []);

  const translateY = useMemo(() => {
    if (focusedRailIndex <= 0) return 0;
    return -(focusedRailIndex * RAIL_HEIGHT);
  }, [focusedRailIndex]);

  const visibleRails = useMemo(() => {
    const start = Math.max(0, focusedRailIndex - VISIBLE_RAIL_BUFFER);
    const end = Math.min(rails.length - 1, focusedRailIndex + VISIBLE_RAIL_BUFFER);
    return { start, end };
  }, [focusedRailIndex, rails.length]);

  const railListStyle = useMemo(
    () => ({
      transform: 'translateY(' + translateY + 'px)',
    }),
    [translateY],
  );

  if (error) {
    return <NetworkError message={error.message} onRetry={fetchContent} />;
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <RailSkeleton />
        <RailSkeleton />
        <RailSkeleton />
      </div>
    );
  }

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className={styles.container}>
        <div className={styles.railList} style={railListStyle}>
          {rails.map((rail, index) => {
            const isVisible =
              index >= visibleRails.start && index <= visibleRails.end;
            if (!isVisible) {
              return (
                <div key={rail.focusKey} style={PLACEHOLDER_STYLE} />
              );
            }
            return (
              <RailWithIndex
                key={rail.focusKey}
                rail={rail}
                index={index}
                onSelectItem={handleSelectItem}
                onRailFocus={handleRailFocus}
              />
            );
          })}
        </div>
      </div>
    </FocusContext.Provider>
  );
}

interface RailWithIndexProps {
  rail: RailData;
  index: number;
  onSelectItem: (item: Item) => void;
  onRailFocus: (index: number) => void;
}

const RailWithIndex = memo(function RailWithIndex({
  rail,
  index,
  onSelectItem,
  onRailFocus,
}: RailWithIndexProps): ReactElement {
  const handleFocusCapture = useCallback((): void => {
    onRailFocus(index);
  }, [onRailFocus, index]);

  return (
    <div onFocusCapture={handleFocusCapture}>
      <ContentRail
        title={rail.title}
        items={rail.items}
        onSelectItem={onSelectItem}
        railFocusKey={rail.focusKey}
      />
    </div>
  );
});

function RailSkeleton(): ReactElement {
  return (
    <div className={styles.railSkeleton}>
      <div className={styles.skeletonTitle} />
      <PosterSkeleton count={7} />
    </div>
  );
}
