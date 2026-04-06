import { create } from 'zustand';
import { getCurrentFocusKey } from '@noriginmedia/norigin-spatial-navigation';

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
  title?: string;
  resumeTime?: number;
}

interface StackEntry {
  screen: Screen;
  params: ScreenParams;
  lastFocusKey: string | null;
}

interface NavigateOptions {
  params?: ScreenParams;
  lastFocusKey?: string;
}

interface NavigateWithFocusOptions {
  params?: ScreenParams;
}

interface UiState {
  currentScreen: Screen;
  screenParams: ScreenParams;
  navigationStack: StackEntry[];
  lastRestoredFocusKey: string | null;
  navigate: (screen: Screen, options?: NavigateOptions) => void;
  navigateWithFocus: (screen: Screen, options?: NavigateWithFocusOptions) => void;
  goBack: () => void;
  clearStack: () => void;
  clearLastRestoredFocusKey: () => void;
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
  lastRestoredFocusKey: null,

  navigate(screen: Screen, options: NavigateOptions = {}): void {
    const state = get();
    const params = options.params ?? {};
    const focusKey = options.lastFocusKey ?? null;

    if (screen === state.currentScreen) {
      const currentParams = state.screenParams;
      const paramKeys = Object.keys(params) as (keyof ScreenParams)[];
      const currentKeys = Object.keys(currentParams) as (keyof ScreenParams)[];
      if (paramKeys.length === currentKeys.length &&
          paramKeys.every((k) => params[k] === currentParams[k])) {
        return;
      }
    }

    if (state.currentScreen === 'auth') {
      set({
        currentScreen: screen,
        screenParams: params,
      });
      return;
    }

    const entry: StackEntry = {
      screen: state.currentScreen,
      params: state.screenParams,
      lastFocusKey: focusKey,
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

  navigateWithFocus(screen: Screen, options: NavigateWithFocusOptions = {}): void {
    const focusKey = getCurrentFocusKey();
    get().navigate(screen, { params: options.params, lastFocusKey: focusKey });
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
      lastRestoredFocusKey: previous.lastFocusKey,
    });
  },

  clearStack(): void {
    set({
      currentScreen: 'auth',
      screenParams: {},
      navigationStack: [],
    });
  },

  clearLastRestoredFocusKey(): void {
    set({ lastRestoredFocusKey: null });
  },
}));

export type { Screen, ScreenParams, StackEntry };
