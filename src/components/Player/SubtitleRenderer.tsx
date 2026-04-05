import { ReactElement, memo } from 'react';
import styles from './SubtitleRenderer.module.css';

interface SubtitleRendererProps {
  text: string | null;
}

export const SubtitleRenderer = memo(function SubtitleRenderer({
  text,
}: SubtitleRendererProps): ReactElement | null {
  if (text === null) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.text}>{text}</div>
    </div>
  );
});
