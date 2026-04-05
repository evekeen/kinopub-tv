import { ReactElement, Suspense, lazy, useMemo } from 'react';
import {
  useFocusable,
  FocusContext,
} from '@noriginmedia/norigin-spatial-navigation';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TransitionWrapper } from './components/TransitionWrapper';
import { Sidebar } from './components/Sidebar';
import { Spinner } from './components/LoadingSkeleton';
import { PlayerProvider } from './contexts/PlayerContext';
import { useAuthStore } from './store/auth';
import { useUiStore } from './store/ui';
import type { Screen } from './store/ui';
import styles from './App.module.css';

const AuthPage = lazy(() =>
  import('./pages/AuthPage').then((m) => ({ default: m.AuthPage })),
);

const HomePage = lazy(() =>
  import('./pages/HomePage').then((m) => ({ default: m.HomePage })),
);

const ContentPage = lazy(() =>
  import('./pages/ContentPage').then((m) => ({ default: m.ContentPage })),
);

const PlayerPage = lazy(() =>
  import('./pages/PlayerPage').then((m) => ({ default: m.PlayerPage })),
);

function resolveScreen(screen: Screen, isAuthenticated: boolean): ReactElement {
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  switch (screen) {
    case 'auth':
      return <AuthPage />;
    case 'home':
      return <HomePage />;
    case 'content':
      return <ContentPage />;
    case 'player':
      return <PlayerPage />;
    case 'search':
    case 'bookmarks':
    case 'history':
    case 'settings':
      return <div>Screen: {screen}</div>;
    default: {
      const _exhaustive: never = screen;
      throw new Error(`Unhandled screen: ${_exhaustive}`);
    }
  }
}

function ContentArea({ children }: { children: ReactElement }): ReactElement {
  const { ref, focusKey } = useFocusable({
    trackChildren: true,
    saveLastFocusedChild: true,
  });

  return (
    <FocusContext.Provider value={focusKey}>
      <main ref={ref} className={styles.content}>
        {children}
      </main>
    </FocusContext.Provider>
  );
}

export function App(): ReactElement {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentScreen = useUiStore((s) => s.currentScreen);

  const screenContent = useMemo(
    () => resolveScreen(currentScreen, isAuthenticated),
    [currentScreen, isAuthenticated],
  );
  const transitionKey = isAuthenticated ? currentScreen : 'auth';
  const showSidebar = isAuthenticated && currentScreen !== 'player';

  return (
    <ErrorBoundary>
      <PlayerProvider>
        <Suspense fallback={<Spinner />}>
          <div className={styles.layout}>
            {showSidebar && <Sidebar />}
            <ContentArea>
              <TransitionWrapper transitionKey={transitionKey}>
                {screenContent}
              </TransitionWrapper>
            </ContentArea>
          </div>
        </Suspense>
      </PlayerProvider>
    </ErrorBoundary>
  );
}
