import { ReactElement, memo, useCallback } from 'react';
import {
  useFocusable,
  FocusContext,
} from '@noriginmedia/norigin-spatial-navigation';
import { useUiStore } from '../store/ui';
import type { Screen } from '../store/ui';
import styles from './Sidebar.module.css';

interface SidebarItemConfig {
  screen: Screen;
  label: string;
  icon: string;
}

const SIDEBAR_ITEMS: readonly SidebarItemConfig[] = [
  { screen: 'home', label: 'Home', icon: '⌂' },
  { screen: 'search', label: 'Search', icon: '⌕' },
  { screen: 'bookmarks', label: 'Bookmarks', icon: '★' },
  { screen: 'history', label: 'History', icon: '⏱' },
  { screen: 'settings', label: 'Settings', icon: '⚙' },
];

interface SidebarItemProps {
  config: SidebarItemConfig;
  isActive: boolean;
  onSelect: (screen: Screen) => void;
}

const SidebarItem = memo(function SidebarItem({
  config,
  isActive,
  onSelect,
}: SidebarItemProps): ReactElement {
  const handleEnterPress = useCallback((): void => {
    onSelect(config.screen);
  }, [config.screen, onSelect]);

  const { ref, focused } = useFocusable({
    onEnterPress: handleEnterPress,
  });

  let className = styles.item;
  if (focused) {
    className = styles.itemFocused;
  } else if (isActive) {
    className = styles.itemActive;
  }

  return (
    <div ref={ref} className={className}>
      <span className={styles.icon}>{config.icon}</span>
      <span className={styles.label}>{config.label}</span>
    </div>
  );
});

export const Sidebar = memo(function Sidebar(): ReactElement {
  const currentScreen = useUiStore((s) => s.currentScreen);
  const navigate = useUiStore((s) => s.navigate);

  const handleSelect = useCallback(
    (screen: Screen): void => {
      navigate(screen);
    },
    [navigate],
  );

  const { ref, focusKey } = useFocusable({
    trackChildren: true,
    saveLastFocusedChild: true,
    isFocusBoundary: true,
    focusBoundaryDirections: ['up', 'down'],
  });

  return (
    <FocusContext.Provider value={focusKey}>
      <nav ref={ref} className={styles.sidebar}>
        {SIDEBAR_ITEMS.map((config) => (
          <SidebarItem
            key={config.screen}
            config={config}
            isActive={currentScreen === config.screen}
            onSelect={handleSelect}
          />
        ))}
      </nav>
    </FocusContext.Provider>
  );
});
