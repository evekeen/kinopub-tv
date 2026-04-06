import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import { HistoryPage } from './HistoryPage';
import { useUiStore } from '../store/ui';
import { useAuthStore } from '../store/auth';
import type { Item, HistoryEntry } from '../types';

function makeItem(id: number, title: string): Item {
  return {
    id,
    title,
    type: 'movie',
    subtype: null,
    year: 2024,
    cast: '',
    director: '',
    voice: '',
    duration: { average: 120, total: 120 },
    langs: 1,
    ac3: 0,
    quality: 1080,
    poor_quality: false,
    plot: '',
    imdb: 0,
    imdb_rating: 0,
    imdb_votes: 0,
    kinopoisk: 0,
    kinopoisk_rating: 0,
    kinopoisk_votes: 0,
    rating: 0,
    rating_votes: 0,
    rating_percentage: 0,
    views: 0,
    comments: 0,
    finished: true,
    advert: false,
    in_watchlist: false,
    subscribed: false,
    created_at: 1700000000,
    updated_at: 1700000000,
    posters: {
      small: 'https://example.com/small.jpg',
      medium: 'https://example.com/medium.jpg',
      big: 'https://example.com/big.jpg',
    },
    trailer: { id: 0, url: '' },
    genres: [],
    countries: [],
    bookmarks: [],
  };
}

function makeHistoryEntry(id: number, title: string, deleted: boolean): HistoryEntry {
  return {
    counter: 1,
    first_seen: 1700000000,
    last_seen: 1700000000,
    time: 3600,
    deleted,
    item: makeItem(id, title),
  };
}

function makeHistoryResponse(entries: HistoryEntry[]): { history: HistoryEntry[] } {
  return {
    history: entries,
  };
}

vi.mock('../api/history', () => ({
  getHistory: vi.fn(),
}));

describe('HistoryPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    init({ debug: false, visualDebug: false });
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'test-token' });
    useUiStore.setState({
      currentScreen: 'history',
      screenParams: {},
      navigationStack: [{ screen: 'home', params: {}, lastFocusKey: null }],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders history items', async () => {
    const entries = [
      makeHistoryEntry(1, 'Watched Movie', false),
      makeHistoryEntry(2, 'Another Show', false),
    ];

    const history = await import('../api/history');
    vi.mocked(history.getHistory).mockResolvedValue(makeHistoryResponse(entries));

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Watched Movie')).toBeDefined();
      expect(screen.getByText('Another Show')).toBeDefined();
    });
  });

  it('filters out deleted entries', async () => {
    const entries = [
      makeHistoryEntry(1, 'Visible Movie', false),
      makeHistoryEntry(2, 'Deleted Movie', true),
    ];

    const history = await import('../api/history');
    vi.mocked(history.getHistory).mockResolvedValue(makeHistoryResponse(entries));

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Visible Movie')).toBeDefined();
      expect(screen.queryByText('Deleted Movie')).toBeNull();
    });
  });

  it('shows empty state when no history', async () => {
    const history = await import('../api/history');
    vi.mocked(history.getHistory).mockResolvedValue(makeHistoryResponse([]));

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('No watch history yet')).toBeDefined();
    });
  });

  it('shows error state on load failure', async () => {
    const history = await import('../api/history');
    vi.mocked(history.getHistory).mockRejectedValue(new Error('Network error'));

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeDefined();
    });
  });

  it('renders page title', async () => {
    const history = await import('../api/history');
    vi.mocked(history.getHistory).mockResolvedValue(makeHistoryResponse([]));

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Watch History')).toBeDefined();
    });
  });
});
