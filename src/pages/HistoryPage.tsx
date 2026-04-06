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
import type { PosterItem } from '../components/PosterCard';
import { PosterSkeleton } from '../components/LoadingSkeleton';
import { NetworkError } from '../components/NetworkError';
import { useBackKey } from '../hooks/useBackKey';
import { getHistory } from '../api/history';
import { useUiStore } from '../store/ui';
import type { HistoryEntry } from '../types';
import styles from './HistoryPage.module.css';

const VISIBLE_CARD_BUFFER = 5;
const CARDS_PER_ROW = 7;
const CARD_ROW_HEIGHT = 480;
const HISTORY_PAGE_FOCUS_KEY = 'history-page';

interface HistoryCardProps {
  item: PosterItem;
  index: number;
  focusedIndex: number;
  onSelect: (item: PosterItem) => void;
  onFocus: (item: PosterItem, index: number) => void;
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
    (focusedPosterItem: PosterItem): void => {
      onFocus(focusedPosterItem, index);
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
      setEntries(response.history);
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

  const handleSelectPosterItem = useCallback(
    (item: PosterItem): void => {
      navigate('content', { params: { contentId: item.id }, lastFocusKey: HISTORY_PAGE_FOCUS_KEY });
    },
    [navigate],
  );

  const handleCardFocus = useCallback((_item: PosterItem, index: number): void => {
    setFocusedCardIndex(index);
  }, []);

  useBackKey(goBack);

  const handleRetry = useCallback((): void => {
    setError(null);
    loadHistory();
  }, [loadHistory]);

  const items = useMemo(
    () => entries.filter((e) => e.deleted !== true).map((e) => e.item),
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
                  onSelect={handleSelectPosterItem}
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
