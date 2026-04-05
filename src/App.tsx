import { ReactElement, Suspense, lazy, useMemo } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TransitionWrapper } from './components/TransitionWrapper';
import { Spinner } from './components/LoadingSkeleton';
import { useAuthStore } from './store/auth';
import { useUiStore } from './store/ui';
import type { Screen } from './store/ui';

const AuthPage = lazy(() =>
  import('./pages/AuthPage').then((m) => ({ default: m.AuthPage })),
);

function resolveScreen(screen: Screen, isAuthenticated: boolean): ReactElement {
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  switch (screen) {
    case 'auth':
      return <AuthPage />;
    case 'home':
    case 'content':
    case 'player':
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

export function App(): ReactElement {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentScreen = useUiStore((s) => s.currentScreen);

  const screenContent = useMemo(
    () => resolveScreen(currentScreen, isAuthenticated),
    [currentScreen, isAuthenticated],
  );
  const transitionKey = isAuthenticated ? currentScreen : 'auth';

  return (
    <ErrorBoundary>
      <Suspense fallback={<Spinner />}>
        <TransitionWrapper transitionKey={transitionKey}>
          {screenContent}
        </TransitionWrapper>
      </Suspense>
    </ErrorBoundary>
  );
}
