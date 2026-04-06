import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import { HomePage } from './HomePage';
import { useAuthStore } from '../store/auth';
import { useUiStore } from '../store/ui';
import type { WatchingSerialItem } from '../types';

function makeWatchingItem(id: number, title: string, watched: number, total: number): WatchingSerialItem {
  return {
    id,
    title,
    type: 'serial',
    subtype: '',
    posters: {
      small: 'https://example.com/small.jpg',
      medium: 'https://example.com/medium.jpg',
      big: 'https://example.com/big.jpg',
    },
    new: total - watched,
    total,
    watched,
  };
}

vi.mock('../api/watching', () => ({
  getWatchingSerials: vi.fn(),
}));

describe('HomePage', () => {
  beforeEach(async () => {
    init({ debug: false, visualDebug: false });
    useAuthStore.setState({ isAuthenticated: true });
    useUiStore.setState({
      currentScreen: 'home',
      screenParams: {},
      navigationStack: [],
    });

    const watching = await import('../api/watching');
    vi.mocked(watching.getWatchingSerials).mockResolvedValue({
      status: 200,
      items: [
        makeWatchingItem(1, 'Scrubs', 187, 189),
        makeWatchingItem(2, 'Fallout', 10, 16),
        makeWatchingItem(3, 'Not Started', 0, 20),
        makeWatchingItem(4, 'Completed', 50, 50),
      ],
    });
  });

  it('renders loading skeleton initially', () => {
    const { container } = render(<HomePage />);
    const skeletons = container.querySelectorAll('[class*="skeleton"], [class*="loading"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders in-progress shows as grid', async () => {
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Scrubs')).toBeDefined();
    });

    expect(screen.getByText('Fallout')).toBeDefined();
    expect(screen.getByText('Continue Watching')).toBeDefined();
  });

  it('filters out not-started and completed shows', async () => {
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Scrubs')).toBeDefined();
    });

    expect(screen.queryByText('Not Started')).toBeNull();
    expect(screen.queryByText('Completed')).toBeNull();
  });

  it('shows empty state when no in-progress shows', async () => {
    const watching = await import('../api/watching');
    vi.mocked(watching.getWatchingSerials).mockResolvedValue({
      status: 200,
      items: [makeWatchingItem(1, 'Not Started', 0, 20)],
    });

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('No shows in progress')).toBeDefined();
    });
  });

  it('shows error on API failure', async () => {
    const watching = await import('../api/watching');
    vi.mocked(watching.getWatchingSerials).mockRejectedValueOnce(new Error('Network error'));

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeDefined();
    });
  });
});
