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
} from '@noriginmedia/norigin-spatial-navigation';
import { PosterCard } from './PosterCard';
import type { Item } from '../types';
import styles from './ContentRail.module.css';

const CARD_WIDTH = 250;
const CARD_GAP = 16;
const CARD_STEP = CARD_WIDTH + CARD_GAP;
const VISIBLE_BUFFER = 5;
const IMAGE_LOAD_BUFFER = 3;

interface ContentRailProps {
  title: string;
  items: ReadonlyArray<Item>;
  onSelectItem: (item: Item) => void;
  railFocusKey: string;
}

function buildCardFocusKey(railKey: string, index: number): string {
  return railKey + '-card-' + index;
}

export const ContentRail = memo(function ContentRail({
  title,
  items,
  onSelectItem,
  railFocusKey,
}: ContentRailProps): ReactElement {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const preferredChild = buildCardFocusKey(railFocusKey, focusedIndex);

  const { ref } = useFocusable({
    trackChildren: true,
    saveLastFocusedChild: true,
    focusKey: railFocusKey,
    preferredChildFocusKey: preferredChild,
  });

  const handleItemFocus = useCallback((_item: Item, index: number): void => {
    setFocusedIndex(index);
  }, []);

  const visibleRange = useMemo(() => {
    const start = Math.max(0, focusedIndex - VISIBLE_BUFFER);
    const end = Math.min(items.length - 1, focusedIndex + VISIBLE_BUFFER);
    return { start, end };
  }, [focusedIndex, items.length]);

  const translateX = useMemo(() => {
    return -(focusedIndex * CARD_STEP);
  }, [focusedIndex]);

  const visibleCards = useMemo(() => {
    const cards: ReactElement[] = [];
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      const item = items[i];
      const shouldLoadImage =
        i >= focusedIndex - IMAGE_LOAD_BUFFER &&
        i <= focusedIndex + IMAGE_LOAD_BUFFER;
      cards.push(
        <PosterCardWithIndex
          key={item.id}
          item={item}
          index={i}
          shouldLoadImage={shouldLoadImage}
          onSelect={onSelectItem}
          onFocus={handleItemFocus}
          focusKey={buildCardFocusKey(railFocusKey, i)}
        />,
      );
    }
    return cards;
  }, [visibleRange, items, focusedIndex, onSelectItem, handleItemFocus, railFocusKey]);

  const trackStyle = useMemo(
    () => ({
      transform: 'translateX(' + translateX + 'px)',
    }),
    [translateX],
  );

  const spacerStyle = useMemo(
    () => ({
      width: visibleRange.start * CARD_STEP + 'px',
      flexShrink: 0 as const,
    }),
    [visibleRange.start],
  );

  return (
    <div className={styles.rail}>
      <div className={styles.railTitle}>{title}</div>
      <FocusContext.Provider value={railFocusKey}>
        <div ref={ref} className={styles.viewport}>
          <div className={styles.track} style={trackStyle}>
            {visibleRange.start > 0 && <div style={spacerStyle} />}
            {visibleCards}
          </div>
        </div>
      </FocusContext.Provider>
    </div>
  );
});

interface PosterCardWithIndexProps {
  item: Item;
  index: number;
  shouldLoadImage: boolean;
  onSelect: (item: Item) => void;
  onFocus: (item: Item, index: number) => void;
  focusKey: string;
}

const PosterCardWithIndex = memo(function PosterCardWithIndex({
  item,
  index,
  shouldLoadImage,
  onSelect,
  onFocus,
  focusKey,
}: PosterCardWithIndexProps): ReactElement {
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
