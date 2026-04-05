import { ReactElement, ReactNode, useEffect, useState } from 'react';
import styles from './TransitionWrapper.module.css';

interface TransitionWrapperProps {
  children: ReactNode;
  transitionKey: string;
}

export function TransitionWrapper({
  children,
  transitionKey,
}: TransitionWrapperProps): ReactElement {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const frameId = requestAnimationFrame(() => {
      setVisible(true);
    });
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [transitionKey]);

  const className = visible ? styles.visible : styles.hidden;

  return (
    <div className={className}>
      {children}
    </div>
  );
}
