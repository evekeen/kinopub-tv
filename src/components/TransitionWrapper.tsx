import { ReactElement, ReactNode, memo, useEffect, useState } from 'react';
import styles from './TransitionWrapper.module.css';

interface TransitionWrapperProps {
  children: ReactNode;
  transitionKey: string;
}

export const TransitionWrapper = memo(function TransitionWrapper({
  children,
  transitionKey,
}: TransitionWrapperProps): ReactElement {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    let innerFrameId: number = 0;
    const outerFrameId = requestAnimationFrame(() => {
      innerFrameId = requestAnimationFrame(() => {
        setVisible(true);
      });
    });
    return () => {
      cancelAnimationFrame(outerFrameId);
      cancelAnimationFrame(innerFrameId);
    };
  }, [transitionKey]);

  const className = visible ? styles.visible : styles.hidden;

  return (
    <div className={className}>
      {children}
    </div>
  );
});
