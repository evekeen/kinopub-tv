import {
  ReactElement,
  memo,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  useFocusable,
  FocusContext,
  setFocus,
} from '@noriginmedia/norigin-spatial-navigation';
import { useAuthStore } from '../store/auth';
import { useUiStore } from '../store/ui';
import styles from './SettingsPage.module.css';

type CdnServer = 'auto' | 'nl' | 'ru';

interface CdnOption {
  value: CdnServer;
  label: string;
}

const CDN_OPTIONS: ReadonlyArray<CdnOption> = [
  { value: 'auto', label: 'Auto' },
  { value: 'nl', label: 'Netherlands' },
  { value: 'ru', label: 'Russia' },
];

const SETTINGS_STORAGE_KEY = 'kinopub_settings';
const SETTINGS_PAGE_FOCUS_KEY = 'settings-page';

interface AppSettings {
  cdnServer: CdnServer;
  showClock: boolean;
}

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored !== null) {
      const parsed: unknown = JSON.parse(stored);
      if (typeof parsed === 'object' && parsed !== null) {
        const obj = parsed as Record<string, unknown>;
        return {
          cdnServer: isCdnServer(obj.cdnServer) ? obj.cdnServer : 'auto',
          showClock: typeof obj.showClock === 'boolean' ? obj.showClock : false,
        };
      }
    }
  } catch {
  }
  return { cdnServer: 'auto', showClock: false };
}

function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function isCdnServer(value: unknown): value is CdnServer {
  return value === 'auto' || value === 'nl' || value === 'ru';
}

interface SettingRowProps {
  label: string;
  value: string;
  isActive?: boolean;
  onPress: () => void;
  focusKey: string;
}

const SettingRow = memo(function SettingRow({
  label,
  value,
  isActive,
  onPress,
  focusKey: externalFocusKey,
}: SettingRowProps): ReactElement {
  const { ref, focused } = useFocusable({
    onEnterPress: onPress,
    focusKey: externalFocusKey,
  });

  const rowClass = focused ? styles.settingRowFocused : styles.settingRow;
  const valueClass = isActive === true ? styles.settingValueActive : styles.settingValue;

  return (
    <div ref={ref} className={rowClass}>
      <span className={styles.settingLabel}>{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
});

interface LogoutRowProps {
  onPress: () => void;
  focusKey: string;
}

const LogoutRow = memo(function LogoutRow({
  onPress,
  focusKey: externalFocusKey,
}: LogoutRowProps): ReactElement {
  const { ref, focused } = useFocusable({
    onEnterPress: onPress,
    focusKey: externalFocusKey,
  });

  const rowClass = focused ? styles.logoutRowFocused : styles.logoutRow;

  return (
    <div ref={ref} className={rowClass}>
      <span className={styles.logoutLabel}>Logout</span>
    </div>
  );
});

export const SettingsPage = memo(function SettingsPage(): ReactElement {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const rafRef = useRef<number | null>(null);

  const logout = useAuthStore((s) => s.logout);
  const clearStack = useUiStore((s) => s.clearStack);
  const goBack = useUiStore((s) => s.goBack);

  const { ref, focusKey } = useFocusable({
    trackChildren: true,
    saveLastFocusedChild: true,
    focusKey: SETTINGS_PAGE_FOCUS_KEY,
  });

  useEffect(() => {
    rafRef.current = requestAnimationFrame(() => {
      setFocus(SETTINGS_PAGE_FOCUS_KEY);
    });
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleCdnCycle = useCallback((): void => {
    setSettings((prev) => {
      const currentIndex = CDN_OPTIONS.findIndex((o) => o.value === prev.cdnServer);
      const nextIndex = (currentIndex + 1) % CDN_OPTIONS.length;
      const next = { ...prev, cdnServer: CDN_OPTIONS[nextIndex].value };
      saveSettings(next);
      return next;
    });
  }, []);

  const handleClockToggle = useCallback((): void => {
    setSettings((prev) => {
      const next = { ...prev, showClock: !prev.showClock };
      saveSettings(next);
      return next;
    });
  }, []);

  const handleLogout = useCallback((): void => {
    logout();
    clearStack();
  }, [logout, clearStack]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const keyCode = event.keyCode;
      if (keyCode === 10009 || keyCode === 8 || event.key === 'Backspace') {
        event.preventDefault();
        goBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [goBack]);

  const cdnLabel = useMemo((): string => {
    const option = CDN_OPTIONS.find((o) => o.value === settings.cdnServer);
    if (option === undefined) {
      throw new Error('Unhandled CDN server: ' + settings.cdnServer);
    }
    return option.label;
  }, [settings.cdnServer]);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className={styles.container}>
        <div className={styles.header}>
          <span className={styles.title}>Settings</span>
        </div>

        <div className={styles.settingsList}>
          <div className={styles.section}>
            <span className={styles.sectionTitle}>Streaming</span>
            <SettingRow
              label="CDN Server"
              value={cdnLabel}
              onPress={handleCdnCycle}
              focusKey="settings-cdn"
            />
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>Display</span>
            <SettingRow
              label="Show Clock"
              value={settings.showClock ? 'On' : 'Off'}
              isActive={settings.showClock}
              onPress={handleClockToggle}
              focusKey="settings-clock"
            />
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>Account</span>
            <LogoutRow onPress={handleLogout} focusKey="settings-logout" />
          </div>

          <div className={styles.aboutSection}>
            <span className={styles.aboutText}>KinoPub Tizen v1.0.0</span>
            <span className={styles.aboutText}>hls.js player for Samsung Smart TVs</span>
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
});
