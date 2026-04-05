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
import { PosterSkeleton } from '../components/LoadingSkeleton';
import { NetworkError } from '../components/NetworkError';
import { useBackKey } from '../hooks/useBackKey';
import { getHistory } from '../api/history';
import { useUiStore } from '../store/ui';
import type { Item, HistoryEntry } from '../types';
import styles from './HistoryPage.module.css';

const VISIBLE_CARD_BUFFER = 5;
const CARDS_PER_ROW = 7;
const CARD_ROW_HEIGHT = 480;
const HISTORY_PAGE_FOCUS_KEY = 'history-page';

interface HistoryCardProps {
  item: Item;
  index: number;
  focusedIndex: number;
  onSelect: (item: Item) => void;
  onFocus: (item: Item, index: number) => void;
  focusKey: string;
}

const HistoryCard = memo(function HistoryCard({
  item,
  index,
  focusedIndex,
  onSelect,
  onFocus,
  focusKey,
}: HistoryCardProps): ReactElement {
  const shouldLoadImage =
    Math.abs(index - focusedIndex) <= VISIBLE_CARD_BUFFER;

  const handleFocus = useCallback(
    (focusedItem: Item): void => {
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

export const HistoryPage = memo(function HistoryPage(): ReactElement {
  const [entries, setEntries] = useState<ReadonlyArray<HistoryEntry>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [focusedCardIndex, setFocusedCardIndex] = useState(0);
  const rafRef = useRef<number | null>(null);

  const navigate = useUiStore((s) => s.navigate);
  const setLastFocusKey = useUiStore((s) => s.setLastFocusKey);
  const goBack = useUiStore((s) => s.goBack);

  const { ref, focusKey } = useFocusable({
    trackChildren: true,
    saveLastFocusedChild: true,
    focusKey: HISTORY_PAGE_FOCUS_KEY,
  });

  const loadHistory = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await getHistory();
      setEntries(response.items);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load history'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(() => {
      setFocus(HISTORY_PAGE_FOCUS_KEY);
    });
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleSelectItem = useCallback(
    (item: Item): void => {
      setLastFocusKey(HISTORY_PAGE_FOCUS_KEY);
      navigate('content', { contentId: item.id });
    },
    [navigate, setLastFocusKey],
  );

  const handleCardFocus = useCallback((_item: Item, index: number): void => {
    setFocusedCardIndex(index);
  }, []);

  useBackKey(goBack);

  const handleRetry = useCallback((): void => {
    setError(null);
    loadHistory();
  }, [loadHistory]);

  const items = useMemo(
    () => entries.filter((e) => !e.deleted).map((e) => e.item),
    [entries],
  );

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
          <span className={styles.title}>Watch History</span>
        </div>

        <div className={styles.itemsContainer}>
          {loading && (
            <div className={styles.loadingContainer}>
              <PosterSkeleton count={7} />
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>▷</span>
              <span className={styles.emptyText}>No watch history yet</span>
            </div>
          )}

          {!loading && items.length > 0 && (
            <div className={styles.itemsGrid} style={gridStyle}>
              {items.map((item, index) => (
                <HistoryCard
                  key={item.id + '-' + index}
                  item={item}
                  index={index}
                  focusedIndex={focusedCardIndex}
                  onSelect={handleSelectItem}
                  onFocus={handleCardFocus}
                  focusKey={'history-card-' + item.id + '-' + index}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </FocusContext.Provider>
  );
});
