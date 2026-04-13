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
import { PosterCard } from '../components/PosterCard';
import type { PosterItem } from '../types';
import { PosterSkeleton } from '../components/LoadingSkeleton';
import { NetworkError } from '../components/NetworkError';
import { useBackKey } from '../hooks/useBackKey';
import { getWatchingSerials } from '../api/watching';
import { AuthRequiredError } from '../api/client';
import { useUiStore } from '../store/ui';
import { useAuthStore } from '../store/auth';
import type { WatchingSerialItem } from '../types';
import styles from './HomePage.module.css';

const VISIBLE_CARD_BUFFER = 21;
const CARDS_PER_ROW = 7;
const CARD_ROW_HEIGHT = 480;
const HOME_PAGE_FOCUS_KEY = 'home-page';

interface WatchingCardProps {
  item: WatchingSerialItem;
  index: number;
  focusedIndex: number;
  onSelect: (item: PosterItem) => void;
  onFocus: (item: PosterItem, index: number) => void;
  focusKey: string;
}

const WatchingCard = memo(function WatchingCard({
  item,
  index,
  focusedIndex,
  onSelect,
  onFocus,
  focusKey,
}: WatchingCardProps): ReactElement {
  const shouldLoadImage =
    Math.abs(index - focusedIndex) <= VISIBLE_CARD_BUFFER;

  const handleFocus = useCallback(
    (focusedItem: PosterItem): void => {
      onFocus(focusedItem, index);
    },
    [onFocus, index],
  );

  return (
    <PosterCard
      item={item}
      shouldLoadImage={shouldLoadImage}
      onSelect={onSelect}
      onFocus={handleFocus}
      focusKey={focusKey}
    />
  );
});

export const HomePage = memo(function HomePage(): ReactElement {
  const [items, setItems] = useState<ReadonlyArray<WatchingSerialItem>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [focusedCardIndex, setFocusedCardIndex] = useState(0);
  const rafRef = useRef<number | null>(null);

  const navigate = useUiStore((s) => s.navigate);
  const goBack = useUiStore((s) => s.goBack);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useBackKey(goBack);

  const { ref, focusKey } = useFocusable({
    trackChildren: true,
    saveLastFocusedChild: true,
    focusKey: HOME_PAGE_FOCUS_KEY,
  });

  const fetchContent = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await getWatchingSerials('updated', true);
      const inProgress = response.items.filter(
        (s) => s.watched < s.total,
      );
      setItems(inProgress);
    } catch (err) {
      if (err instanceof AuthRequiredError) return;
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
    if (!loading && items.length > 0) {
      rafRef.current = requestAnimationFrame(() => {
        setFocus(HOME_PAGE_FOCUS_KEY);
      });
    }
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [loading, items.length]);

  const handleSelectItem = useCallback(
    (item: PosterItem): void => {
      navigate('content', { params: { contentId: item.id }, lastFocusKey: HOME_PAGE_FOCUS_KEY });
    },
    [navigate],
  );

  const handleCardFocus = useCallback((_item: PosterItem, index: number): void => {
    setFocusedCardIndex(index);
  }, []);

  const handleRetry = useCallback((): void => {
    setError(null);
    fetchContent();
  }, [fetchContent]);

  const focusedRow = useMemo(
    () => Math.floor(focusedCardIndex / CARDS_PER_ROW),
    [focusedCardIndex],
  );

  const gridTranslateY = useMemo(() => {
    if (focusedRow <= 0) return 0;
    return -(focusedRow * CARD_ROW_HEIGHT);
  }, [focusedRow]);

  const gridStyle = useMemo(
    () => ({ transform: 'translateY(' + gridTranslateY + 'px)' }),
    [gridTranslateY],
  );

  if (error) {
    return <NetworkError message={error.message} onRetry={handleRetry} />;
  }

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className={styles.container}>
        <div className={styles.header}>
          <span className={styles.title}>Continue Watching</span>
        </div>

        <div className={styles.itemsContainer}>
          {loading && (
            <div className={styles.loadingContainer}>
              <PosterSkeleton count={14} />
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyText}>No shows in progress</span>
              <span className={styles.emptyHint}>Subscribe to shows and start watching</span>
            </div>
          )}

          {!loading && items.length > 0 && (
            <div className={styles.itemsGrid} style={gridStyle}>
              {items.map((item, index) => (
                <WatchingCard
                  key={item.id}
                  item={item}
                  index={index}
                  focusedIndex={focusedCardIndex}
                  onSelect={handleSelectItem}
                  onFocus={handleCardFocus}
                  focusKey={'home-card-' + item.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </FocusContext.Provider>
  );
});
