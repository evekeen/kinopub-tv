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
import { getFolders, getFolderItems } from '../api/bookmarks';
import { useUiStore } from '../store/ui';
import type { Item, BookmarkFolder } from '../types';
import styles from './BookmarksPage.module.css';

const VISIBLE_CARD_BUFFER = 5;
const CARDS_PER_ROW = 7;
const CARD_ROW_HEIGHT = 480;
const FOLDER_HEIGHT = 80;
const BOOKMARKS_PAGE_FOCUS_KEY = 'bookmarks-page';
const FOLDER_BACK_FOCUS_KEY = 'folder-back-btn';

interface FolderRowProps {
  folder: BookmarkFolder;
  onSelect: (folder: BookmarkFolder) => void;
  onFocus: (folder: BookmarkFolder, index: number) => void;
  index: number;
  focusKey: string;
}

const FolderRow = memo(function FolderRow({
  folder,
  onSelect,
  onFocus,
  index,
  focusKey: externalFocusKey,
}: FolderRowProps): ReactElement {
  const handleEnterPress = useCallback((): void => {
    onSelect(folder);
  }, [folder, onSelect]);

  const handleFocus = useCallback((): void => {
    onFocus(folder, index);
  }, [folder, onFocus, index]);

  const { ref, focused } = useFocusable({
    onEnterPress: handleEnterPress,
    onFocus: handleFocus,
    focusKey: externalFocusKey,
  });

  const rowClass = focused ? styles.folderFocused : styles.folder;

  return (
    <div ref={ref} className={rowClass}>
      <span className={styles.folderIcon}>▤</span>
      <div className={styles.folderInfo}>
        <span className={styles.folderTitle}>{folder.title}</span>
        <span className={styles.folderCount}>{folder.count} items</span>
      </div>
    </div>
  );
});

interface ItemCardProps {
  item: Item;
  index: number;
  focusedIndex: number;
  onSelect: (item: Item) => void;
  onFocus: (item: Item, index: number) => void;
  focusKey: string;
}

const ItemCard = memo(function ItemCard({
  item,
  index,
  focusedIndex,
  onSelect,
  onFocus,
  focusKey,
}: ItemCardProps): ReactElement {
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

interface BackButtonProps {
  onPress: () => void;
  label: string;
}

const BackButton = memo(function BackButton({
  onPress,
  label,
}: BackButtonProps): ReactElement {
  const { ref, focused } = useFocusable({
    onEnterPress: onPress,
    focusKey: FOLDER_BACK_FOCUS_KEY,
  });

  const buttonClass = focused ? styles.backButtonFocused : styles.backButton;

  return (
    <div ref={ref} className={buttonClass}>
      ← {label}
    </div>
  );
});

export const BookmarksPage = memo(function BookmarksPage(): ReactElement {
  const [folders, setFolders] = useState<ReadonlyArray<BookmarkFolder>>([]);
  const [selectedFolder, setSelectedFolder] = useState<BookmarkFolder | null>(null);
  const [folderItems, setFolderItems] = useState<ReadonlyArray<Item>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [focusedFolderIndex, setFocusedFolderIndex] = useState(0);
  const [focusedCardIndex, setFocusedCardIndex] = useState(0);
  const rafRef = useRef<number | null>(null);

  const navigate = useUiStore((s) => s.navigate);
  const goBack = useUiStore((s) => s.goBack);

  const { ref, focusKey } = useFocusable({
    trackChildren: true,
    saveLastFocusedChild: true,
    focusKey: BOOKMARKS_PAGE_FOCUS_KEY,
  });

  const loadFolders = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await getFolders();
      setFolders(response.items);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load bookmarks'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFolderItems = useCallback(async (folder: BookmarkFolder): Promise<void> => {
    setLoading(true);
    setError(null);
    setSelectedFolder(folder);
    setFocusedCardIndex(0);
    try {
      const response = await getFolderItems(folder.id);
      setFolderItems(response.items);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        setFocus(FOLDER_BACK_FOCUS_KEY);
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load folder items'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(() => {
      setFocus(BOOKMARKS_PAGE_FOCUS_KEY);
    });
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleFolderSelect = useCallback(
    (folder: BookmarkFolder): void => {
      loadFolderItems(folder);
    },
    [loadFolderItems],
  );

  const handleFolderFocus = useCallback((_folder: BookmarkFolder, index: number): void => {
    setFocusedFolderIndex(index);
  }, []);

  const handleBackToFolders = useCallback((): void => {
    setSelectedFolder(null);
    setFolderItems([]);
    setFocusedCardIndex(0);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      setFocus('bookmark-folder-' + focusedFolderIndex);
    });
  }, [focusedFolderIndex]);

  const handleSelectItem = useCallback(
    (item: Item): void => {
      navigate('content', { params: { contentId: item.id }, lastFocusKey: BOOKMARKS_PAGE_FOCUS_KEY });
    },
    [navigate],
  );

  const handleCardFocus = useCallback((_item: Item, index: number): void => {
    setFocusedCardIndex(index);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const keyCode = event.keyCode;
      if (keyCode === 10009 || keyCode === 8 || event.key === 'Backspace') {
        event.preventDefault();
        if (selectedFolder !== null) {
          handleBackToFolders();
        } else {
          goBack();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [goBack, selectedFolder, handleBackToFolders]);

  const handleRetry = useCallback((): void => {
    setError(null);
    if (selectedFolder !== null) {
      loadFolderItems(selectedFolder);
    } else {
      loadFolders();
    }
  }, [selectedFolder, loadFolderItems, loadFolders]);

  const folderListTranslateY = useMemo(() => {
    if (focusedFolderIndex <= 2) return 0;
    return -((focusedFolderIndex - 2) * FOLDER_HEIGHT);
  }, [focusedFolderIndex]);

  const folderListStyle = useMemo(
    () => ({ transform: 'translateY(' + folderListTranslateY + 'px)' }),
    [folderListTranslateY],
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

  if (selectedFolder !== null) {
    return (
      <FocusContext.Provider value={focusKey}>
        <div ref={ref} className={styles.container}>
          <div className={styles.header}>
            <BackButton onPress={handleBackToFolders} label={selectedFolder.title} />
          </div>

          <div className={styles.itemsContainer}>
            {loading && (
              <div className={styles.loadingContainer}>
                <PosterSkeleton count={7} />
              </div>
            )}

            {!loading && folderItems.length === 0 && (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>▤</span>
                <span className={styles.emptyText}>This folder is empty</span>
              </div>
            )}

            {!loading && folderItems.length > 0 && (
              <div className={styles.itemsGrid} style={gridStyle}>
                {folderItems.map((item, index) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    index={index}
                    focusedIndex={focusedCardIndex}
                    onSelect={handleSelectItem}
                    onFocus={handleCardFocus}
                    focusKey={'bookmark-item-' + item.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </FocusContext.Provider>
    );
  }

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className={styles.container}>
        <div className={styles.header}>
          <span className={styles.title}>Bookmarks</span>
        </div>

        {loading && (
          <div className={styles.folderLoadingContainer}>
            <PosterSkeleton count={3} />
          </div>
        )}

        {!loading && folders.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>☆</span>
            <span className={styles.emptyText}>No bookmark folders</span>
          </div>
        )}

        {!loading && folders.length > 0 && (
          <div className={styles.folderList} style={folderListStyle}>
            {folders.map((folder, index) => (
              <FolderRow
                key={folder.id}
                folder={folder}
                onSelect={handleFolderSelect}
                onFocus={handleFolderFocus}
                index={index}
                focusKey={'bookmark-folder-' + index}
              />
            ))}
          </div>
        )}
      </div>
    </FocusContext.Provider>
  );
});
