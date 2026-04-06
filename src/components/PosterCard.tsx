import { ReactElement, memo, useState, useCallback } from 'react';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import type { Posters } from '../types';
import styles from './PosterCard.module.css';

export interface PosterItem {
  id: number;
  title: string;
  posters: Posters;
  year?: number;
  kinopoisk_rating?: number;
  imdb_rating?: number;
}

interface PosterCardProps {
  item: PosterItem;
  shouldLoadImage: boolean;
  onSelect: (item: PosterItem) => void;
  onFocus: (item: PosterItem) => void;
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

  const kpRating = item.kinopoisk_rating ?? 0;
  const imdbRating = item.imdb_rating ?? 0;
  const rating = kpRating > 0
    ? kpRating.toFixed(1)
    : imdbRating > 0
      ? imdbRating.toFixed(1)
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
      {item.year !== undefined && item.year > 0 && (
        <div className={styles.year}>{item.year}</div>
      )}
    </div>
  );
});
