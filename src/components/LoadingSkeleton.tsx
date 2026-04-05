import { ReactElement, memo, useMemo } from 'react';
import styles from './LoadingSkeleton.module.css';

interface PosterSkeletonProps {
  count?: number;
}

export const PosterSkeleton = memo(function PosterSkeleton({
  count = 5,
}: PosterSkeletonProps): ReactElement {
  const items = useMemo(
    () => Array.from({ length: count }, (_, i) => i),
    [count],
  );

  return (
    <div className={styles.posterRow}>
      {items.map((i) => (
        <div key={i} className={styles.posterCard}>
          <div className={styles.posterImage} />
          <div className={styles.posterTitle} />
        </div>
      ))}
    </div>
  );
});

export const Spinner = memo(function Spinner(): ReactElement {
  return (
    <div className={styles.spinnerContainer}>
      <div className={styles.spinner} />
    </div>
  );
});
