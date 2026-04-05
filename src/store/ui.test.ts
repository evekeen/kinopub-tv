import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useUiStore } from './ui';

const mockExit = vi.fn();

describe('ui store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('tizen', {
      application: {
        getCurrentApplication: () => ({ exit: mockExit }),
      },
    });
    useUiStore.setState({
      currentScreen: 'auth',
      screenParams: {},
      navigationStack: [],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts on auth screen with empty stack', () => {
    const state = useUiStore.getState();
    expect(state.currentScreen).toBe('auth');
    expect(state.screenParams).toEqual({});
    expect(state.navigationStack).toHaveLength(0);
  });

  it('navigate pushes current screen to stack and sets new screen', () => {
    useUiStore.setState({ currentScreen: 'home', screenParams: {} });

    useUiStore.getState().navigate('content', { contentId: 42 });

    const state = useUiStore.getState();
    expect(state.currentScreen).toBe('content');
    expect(state.screenParams).toEqual({ contentId: 42 });
    expect(state.navigationStack).toHaveLength(1);
    expect(state.navigationStack[0].screen).toBe('home');
    expect(state.navigationStack[0].lastFocusKey).toBeNull();
  });

  it('navigate to player does not push to stack', () => {
    useUiStore.setState({ currentScreen: 'content', screenParams: { contentId: 42 } });

    useUiStore.getState().navigate('player', { mediaId: 100 });

    const state = useUiStore.getState();
    expect(state.currentScreen).toBe('player');
    expect(state.screenParams).toEqual({ mediaId: 100 });
    expect(state.navigationStack).toHaveLength(0);
  });

  it('goBack restores previous screen from stack', () => {
    useUiStore.setState({ currentScreen: 'home', screenParams: {} });
    useUiStore.getState().navigate('content', { contentId: 42 });

    useUiStore.getState().goBack();

    const state = useUiStore.getState();
    expect(state.currentScreen).toBe('home');
    expect(state.screenParams).toEqual({});
    expect(state.navigationStack).toHaveLength(0);
  });

  it('goBack calls exit when stack is empty', () => {
    useUiStore.setState({ currentScreen: 'home', navigationStack: [] });

    useUiStore.getState().goBack();

    expect(mockExit).toHaveBeenCalledTimes(1);
  });

  it('setLastFocusKey updates the top of the stack', () => {
    useUiStore.setState({ currentScreen: 'home', screenParams: {} });
    useUiStore.getState().navigate('content', { contentId: 42 });

    useUiStore.getState().setLastFocusKey('poster-card-5');

    const stack = useUiStore.getState().navigationStack;
    expect(stack[0].lastFocusKey).toBe('poster-card-5');
  });

  it('setLastFocusKey is no-op when stack is empty', () => {
    useUiStore.getState().setLastFocusKey('some-key');
    expect(useUiStore.getState().navigationStack).toHaveLength(0);
  });

  it('navigate caps stack at 20 entries', () => {
    useUiStore.setState({ currentScreen: 'home', screenParams: {} });

    for (let i = 0; i < 25; i++) {
      useUiStore.getState().navigate('content', { contentId: i });
    }

    expect(useUiStore.getState().navigationStack.length).toBeLessThanOrEqual(20);
  });

  it('clearStack resets to auth with empty stack', () => {
    useUiStore.setState({ currentScreen: 'home', screenParams: {} });
    useUiStore.getState().navigate('content', { contentId: 1 });
    useUiStore.getState().navigate('search');

    useUiStore.getState().clearStack();

    const state = useUiStore.getState();
    expect(state.currentScreen).toBe('auth');
    expect(state.screenParams).toEqual({});
    expect(state.navigationStack).toHaveLength(0);
  });

  it('navigate preserves params from previous screen in stack', () => {
    useUiStore.setState({ currentScreen: 'content', screenParams: { contentId: 10 } });

    useUiStore.getState().navigate('search');

    const stack = useUiStore.getState().navigationStack;
    expect(stack[0].screen).toBe('content');
    expect(stack[0].params).toEqual({ contentId: 10 });
  });

  it('goBack with deep stack restores correctly', () => {
    useUiStore.setState({ currentScreen: 'home', screenParams: {} });
    useUiStore.getState().navigate('content', { contentId: 1 });
    useUiStore.getState().navigate('search');

    useUiStore.getState().goBack();
    expect(useUiStore.getState().currentScreen).toBe('content');
    expect(useUiStore.getState().screenParams).toEqual({ contentId: 1 });

    useUiStore.getState().goBack();
    expect(useUiStore.getState().currentScreen).toBe('home');
    expect(useUiStore.getState().navigationStack).toHaveLength(0);
  });
});
