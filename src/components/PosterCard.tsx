import { ReactElement, memo, useState, useCallback } from 'react';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import type { Item } from '../types';
import styles from './PosterCard.module.css';

interface PosterCardProps {
  item: Item;
  shouldLoadImage: boolean;
  onSelect: (item: Item) => void;
  onFocus: (item: Item) => void;
  focusKey?: string;
}

export const PosterCard = memo(function PosterCard({
  item,
  shouldLoadImage,
  onSelect,
  onFocus,
  focusKey: externalFocusKey,
}: PosterCardProps): ReactElement {
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleEnterPress = useCallback((): void => {
    onSelect(item);
  }, [item, onSelect]);

  const handleFocus = useCallback((): void => {
    onFocus(item);
  }, [item, onFocus]);

  const { ref, focused } = useFocusable({
    onEnterPress: handleEnterPress,
    onFocus: handleFocus,
    focusKey: externalFocusKey,
  });

  const handleImageLoad = useCallback((): void => {
    setImageLoaded(true);
  }, []);

  const cardClass = focused ? styles.cardFocused : styles.card;
  const imageClass = imageLoaded
    ? styles.image + ' ' + styles.imageLoaded
    : styles.image;

  const rating = item.kinopoisk_rating > 0
    ? item.kinopoisk_rating.toFixed(1)
    : item.imdb_rating > 0
      ? item.imdb_rating.toFixed(1)
      : null;

  return (
    <div ref={ref} className={cardClass}>
      <div className={styles.imageContainer}>
        {!imageLoaded && <div className={styles.placeholder} />}
        {shouldLoadImage && (
          <img
            className={imageClass}
            src={item.posters.medium}
            alt={item.title}
            width={250}
            height={375}
            onLoad={handleImageLoad}
          />
        )}
        {rating !== null && (
          <div className={styles.ratingBadge}>{rating}</div>
        )}
      </div>
      <div className={styles.title}>{item.title}</div>
      <div className={styles.year}>{item.year}</div>
    </div>
  );
});
