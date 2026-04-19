import {
  ReactElement,
  memo,
  useEffect,
  useLayoutEffect,
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
import { searchItems } from '../api/content';
import { useUiStore } from '../store/ui';
import type { Item } from '../types';
import styles from './SearchPage.module.css';

const DEBOUNCE_MS = 500;
const VISIBLE_CARD_BUFFER = 21;
const CARDS_PER_ROW = 7;
const CARD_ROW_HEIGHT = 480;
const SEARCH_INPUT_FOCUS_KEY = 'search-input';
const SEARCH_PAGE_FOCUS_KEY = 'search-page';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onNavigateDown: () => void;
}

const SearchInput = memo(function SearchInput({
  value,
  onChange,
  onNavigateDown,
}: SearchInputProps): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleEnterPress = useCallback((): void => {
    inputRef.current?.focus();
  }, []);

  const { ref, focused } = useFocusable({
    focusKey: SEARCH_INPUT_FOCUS_KEY,
    onEnterPress: handleEnterPress,
  });

  useLayoutEffect(() => {
    if (!focused && document.activeElement === inputRef.current) {
      inputRef.current?.blur();
    }
  }, [focused]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      onChange(e.target.value);
    },
    [onChange],
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.keyCode === 40 || e.key === 'ArrowDown') {
        e.preventDefault();
        inputRef.current?.blur();
        onNavigateDown();
      }
    },
    [onNavigateDown],
  );

  const wrapperClass = focused
    ? styles.inputWrapperFocused
    : styles.inputWrapper;

  return (
    <div ref={ref} className={wrapperClass}>
      <span className={styles.searchIcon}>⌕</span>
      <input
        ref={inputRef}
        className={styles.input}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleInputKeyDown}
        placeholder="Search..."
      />
    </div>
  );
});

interface ResultCardProps {
  item: Item;
  index: number;
  focusedIndex: number;
  onSelect: (item: PosterItem) => void;
  onFocus: (item: PosterItem, index: number) => void;
  focusKey: string;
}

const ResultCard = memo(function ResultCard({
  item,
  index,
  focusedIndex,
  onSelect,
  onFocus,
  focusKey,
}: ResultCardProps): ReactElement {
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

export const SearchPage = memo(function SearchPage(): ReactElement {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ReadonlyArray<Item>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [focusedCardIndex, setFocusedCardIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const searchSeqRef = useRef(0);
  const queryRef = useRef(query);

  const navigate = useUiStore((s) => s.navigate);
  const goBack = useUiStore((s) => s.goBack);

  const { ref, focusKey } = useFocusable({
    trackChildren: true,
    saveLastFocusedChild: true,
    focusKey: SEARCH_PAGE_FOCUS_KEY,
  });

  useEffect(() => {
    rafRef.current = requestAnimationFrame(() => {
      setFocus(SEARCH_INPUT_FOCUS_KEY);
    });
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const executeSearch = useCallback(async (searchQuery: string): Promise<void> => {
    if (searchQuery.trim().length === 0) {
      setResults([]);
      setHasSearched(false);
      setError(null);
      return;
    }

    searchSeqRef.current += 1;
    const seq = searchSeqRef.current;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await searchItems(searchQuery);
      if (seq !== searchSeqRef.current) return;
      setResults(response.items);
      setFocusedCardIndex(0);
    } catch (err) {
      if (seq !== searchSeqRef.current) return;
      setError(err instanceof Error ? err : new Error('Search failed'));
    } finally {
      if (seq === searchSeqRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const handleQueryChange = useCallback(
    (value: string): void => {
      setQuery(value);
      queryRef.current = value;

      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        executeSearch(value);
      }, DEBOUNCE_MS);
    },
    [executeSearch],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleSelectItem = useCallback(
    (item: PosterItem): void => {
      navigate('content', { params: { contentId: item.id }, lastFocusKey: SEARCH_PAGE_FOCUS_KEY });
    },
    [navigate],
  );

  const handleCardFocus = useCallback((_item: PosterItem, index: number): void => {
    setFocusedCardIndex(index);
  }, []);

  const resultsRef = useRef(results);
  resultsRef.current = results;

  const handleInputNavigateDown = useCallback((): void => {
    const currentResults = resultsRef.current;
    if (currentResults.length > 0) {
      requestAnimationFrame(() => {
        setFocus('search-card-' + currentResults[0].id);
      });
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const keyCode = event.keyCode;
      if (keyCode === 10009 || keyCode === 8 || event.key === 'Backspace') {
        const activeEl = document.activeElement;
        const isInputFocused = activeEl instanceof HTMLInputElement;
        if (isInputFocused && queryRef.current.length > 0) {
          return;
        }
        event.preventDefault();
        goBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [goBack]);

  const handleRetry = useCallback((): void => {
    setError(null);
    executeSearch(queryRef.current)
      .then(() => {
        requestAnimationFrame(() => {
          setFocus(SEARCH_INPUT_FOCUS_KEY);
        });
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err : new Error('Search failed'));
      });
  }, [executeSearch]);

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
        <div className={styles.inputContainer}>
          <SearchInput value={query} onChange={handleQueryChange} onNavigateDown={handleInputNavigateDown} />
        </div>

        <div className={styles.resultsContainer}>
          {loading && (
            <div className={styles.loadingContainer}>
              <PosterSkeleton count={7} />
            </div>
          )}

          {!loading && hasSearched && results.length === 0 && (
            <div className={styles.noResults}>
              <span className={styles.noResultsText}>Nothing found</span>
            </div>
          )}

          {!loading && !hasSearched && (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>⌕</span>
              <span className={styles.emptyText}>
                Type to search movies, series, and more
              </span>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className={styles.resultsGrid} style={gridStyle}>
              {results.map((item, index) => (
                <ResultCard
                  key={item.id}
                  item={item}
                  index={index}
                  focusedIndex={focusedCardIndex}
                  onSelect={handleSelectItem}
                  onFocus={handleCardFocus}
                  focusKey={'search-card-' + item.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </FocusContext.Provider>
  );
});
