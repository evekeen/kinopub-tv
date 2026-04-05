import './styles/global.css';
import { createRoot } from 'react-dom/client';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import { App } from './App';

init({
  debug: false,
  visualDebug: false,
});

function registerTizenRemoteKeys(): void {
  if (typeof window === 'undefined' || !window.tizen?.tvinputdevice) {
    return;
  }

  const keys: readonly TizenKeyName[] = [
    'MediaPlayPause',
    'MediaPlay',
    'MediaPause',
    'MediaStop',
    'MediaFastForward',
    'MediaRewind',
    'ColorF0Red',
    'ColorF1Green',
    'ColorF2Yellow',
    'ColorF3Blue',
  ];

  keys.forEach((key) => {
    try {
      window.tizen!.tvinputdevice.registerKey(key);
    } catch {
    }
  });
}

registerTizenRemoteKeys();

const container = document.getElementById('viewport');
if (!container) {
  throw new Error('Root element #viewport not found');
}

const root = createRoot(container);
root.render(<App />);
