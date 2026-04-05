import { useEffect } from 'react';

type RemoteKeyAction =
  | 'playPause'
  | 'play'
  | 'pause'
  | 'stop'
  | 'back'
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'enter'
  | 'fastForward'
  | 'rewind'
  | 'channelUp'
  | 'channelDown';

interface RemoteKeyMap {
  playPause?: () => void;
  play?: () => void;
  pause?: () => void;
  stop?: () => void;
  back?: () => void;
  left?: () => void;
  right?: () => void;
  up?: () => void;
  down?: () => void;
  enter?: () => void;
  fastForward?: () => void;
  rewind?: () => void;
  channelUp?: () => void;
  channelDown?: () => void;
}

const KEY_PLAY_PAUSE = 415;
const KEY_PLAY = 71;
const KEY_PAUSE = 74;
const KEY_STOP = 413;
const KEY_FAST_FORWARD = 417;
const KEY_REWIND = 412;
const KEY_BACK_TIZEN = 10009;
const KEY_BACK_BROWSER = 8;
const KEY_LEFT = 37;
const KEY_RIGHT = 39;
const KEY_UP = 38;
const KEY_DOWN = 40;
const KEY_ENTER = 13;
const KEY_CHANNEL_UP = 427;
const KEY_CHANNEL_DOWN = 428;

function resolveAction(event: KeyboardEvent): RemoteKeyAction | null {
  const code = event.keyCode;

  switch (code) {
    case KEY_PLAY_PAUSE:
      return 'playPause';
    case KEY_PLAY:
      return 'play';
    case KEY_PAUSE:
      return 'pause';
    case KEY_STOP:
      return 'stop';
    case KEY_FAST_FORWARD:
      return 'fastForward';
    case KEY_REWIND:
      return 'rewind';
    case KEY_BACK_TIZEN:
    case KEY_BACK_BROWSER:
      return 'back';
    case KEY_LEFT:
      return 'left';
    case KEY_RIGHT:
      return 'right';
    case KEY_UP:
      return 'up';
    case KEY_DOWN:
      return 'down';
    case KEY_ENTER:
      return 'enter';
    case KEY_CHANNEL_UP:
      return 'channelUp';
    case KEY_CHANNEL_DOWN:
      return 'channelDown';
    default:
      break;
  }

  if (event.key === 'Backspace') return 'back';
  if (event.key === 'MediaPlayPause') return 'playPause';
  if (event.key === 'MediaPlay') return 'play';
  if (event.key === 'MediaPause') return 'pause';
  if (event.key === 'MediaStop') return 'stop';
  if (event.key === 'MediaFastForward') return 'fastForward';
  if (event.key === 'MediaRewind') return 'rewind';

  return null;
}

export function useRemoteKeys(handlers: RemoteKeyMap): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const action = resolveAction(event);
      if (action === null) return;

      const handler = handlers[action];
      if (handler !== undefined) {
        event.preventDefault();
        event.stopPropagation();
        handler();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handlers]);
}

export type { RemoteKeyAction, RemoteKeyMap };
