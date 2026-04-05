import { ReactElement, ReactNode, memo } from 'react';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import styles from './FocusableCard.module.css';

interface FocusableCardProps {
  children: (focused: boolean) => ReactNode;
  onEnterPress: () => void;
  onFocus?: () => void;
  focusKey?: string;
}

export const FocusableCard = memo(function FocusableCard({
  children,
  onEnterPress,
  onFocus,
  focusKey: externalFocusKey,
}: FocusableCardProps): ReactElement {
  const { ref, focused } = useFocusable({
    onEnterPress,
    onFocus,
    focusKey: externalFocusKey,
  });

  return (
    <div ref={ref} className={styles.wrapper}>
      {children(focused)}
    </div>
  );
});
