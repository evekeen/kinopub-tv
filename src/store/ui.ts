import { create } from 'zustand';

type Screen =
  | 'auth'
  | 'home'
  | 'content'
  | 'player'
  | 'search'
  | 'bookmarks'
  | 'history'
  | 'settings';

interface ScreenParams {
  contentId?: number;
  mediaId?: number;
  seasonNumber?: number;
  episodeNumber?: number;
}

interface StackEntry {
  screen: Screen;
  params: ScreenParams;
  lastFocusKey: string | null;
}

interface UiState {
  currentScreen: Screen;
  screenParams: ScreenParams;
  navigationStack: StackEntry[];
  navigate: (screen: Screen, params?: ScreenParams) => void;
  goBack: () => void;
  setLastFocusKey: (key: string) => void;
  clearStack: () => void;
}

const MAX_STACK_SIZE = 20;

function exitApp(): void {
  try {
    if (typeof window !== 'undefined' && window.tizen?.application) {
      window.tizen.application.getCurrentApplication().exit();
    }
  } catch {
  }
}

export const useUiStore = create<UiState>()((set, get) => ({
  currentScreen: 'auth',
  screenParams: {},
  navigationStack: [],

  navigate(screen: Screen, params: ScreenParams = {}): void {
    const state = get();

    if (screen === 'player') {
      set({
        currentScreen: screen,
        screenParams: params,
      });
      return;
    }

    const entry: StackEntry = {
      screen: state.currentScreen,
      params: state.screenParams,
      lastFocusKey: null,
    };

    const stack = [...state.navigationStack, entry];
    const trimmedStack = stack.length > MAX_STACK_SIZE
      ? stack.slice(stack.length - MAX_STACK_SIZE)
      : stack;

    set({
      currentScreen: screen,
      screenParams: params,
      navigationStack: trimmedStack,
    });
  },

  goBack(): void {
    const state = get();
    const stack = state.navigationStack;

    if (stack.length === 0) {
      exitApp();
      return;
    }

    const previous = stack[stack.length - 1];
    set({
      currentScreen: previous.screen,
      screenParams: previous.params,
      navigationStack: stack.slice(0, -1),
    });
  },

  setLastFocusKey(key: string): void {
    const state = get();
    const stack = state.navigationStack;
    if (stack.length === 0) return;

    const updatedStack = [...stack];
    updatedStack[updatedStack.length - 1] = {
      ...updatedStack[updatedStack.length - 1],
      lastFocusKey: key,
    };
    set({ navigationStack: updatedStack });
  },

  clearStack(): void {
    set({
      currentScreen: 'auth',
      screenParams: {},
      navigationStack: [],
    });
  },
}));

export type { Screen, ScreenParams, StackEntry };
