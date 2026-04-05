import { useEffect } from 'react';

export function useBackKey(onBack: () => void): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const keyCode = event.keyCode;
      if (keyCode === 10009 || keyCode === 8 || event.key === 'Backspace') {
        event.preventDefault();
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onBack]);
}
