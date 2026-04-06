type TizenKeyName =
  | 'MediaPlayPause'
  | 'MediaPlay'
  | 'MediaPause'
  | 'MediaStop'
  | 'MediaFastForward'
  | 'MediaRewind'
  | 'ChannelUp'
  | 'ChannelDown'
  | 'ColorF0Red'
  | 'ColorF1Green'
  | 'ColorF2Yellow'
  | 'ColorF3Blue';

interface TizenApplication {
  exit(): void;
}

interface TizenApplicationManager {
  getCurrentApplication(): TizenApplication;
}

interface TizenTvInputDevice {
  registerKey(keyName: TizenKeyName): void;
  unregisterKey(keyName: TizenKeyName): void;
}

interface Tizen {
  application: TizenApplicationManager;
  tvinputdevice: TizenTvInputDevice;
}

interface Window {
  tizen?: Tizen;
}
