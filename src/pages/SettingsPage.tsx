import {
  ReactElement,
  memo,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  useFocusable,
  FocusContext,
  setFocus,
} from '@noriginmedia/norigin-spatial-navigation';
import { useBackKey } from '../hooks/useBackKey';
import { useAuthStore } from '../store/auth';
import { useUiStore } from '../store/ui';
import styles from './SettingsPage.module.css';

const SETTINGS_PAGE_FOCUS_KEY = 'settings-page';

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

  const handleLogout = useCallback((): void => {
    logout();
    clearStack();
  }, [logout, clearStack]);

  useBackKey(goBack);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className={styles.container}>
        <div className={styles.header}>
          <span className={styles.title}>Settings</span>
        </div>

        <div className={styles.settingsList}>
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
