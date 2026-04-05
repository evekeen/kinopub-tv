import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import { SearchPage } from './SearchPage';
import { useUiStore } from '../store/ui';
import { useAuthStore } from '../store/auth';
import type { Item, PaginatedResponse } from '../types';

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

function makePaginatedResponse(items: Item[]): PaginatedResponse<Item> {
  return {
    status: 200,
    items,
    pagination: { total: 1, current: 1, perpage: 20, total_items: items.length },
  };
}

class Deferred {
  promise: Promise<PaginatedResponse<Item>>;
  private _resolve: ((value: PaginatedResponse<Item>) => void) | null = null;

  constructor() {
    this.promise = new Promise<PaginatedResponse<Item>>((r) => { this._resolve = r; });
  }

  resolve(value: PaginatedResponse<Item>): void {
    if (this._resolve === null) throw new Error('Deferred resolve not ready');
    this._resolve(value);
  }
}

vi.mock('../api/content', () => ({
  searchItems: vi.fn(),
}));

describe('SearchPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    init({ debug: false, visualDebug: false });
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'test-token' });
    useUiStore.setState({
      currentScreen: 'search',
      screenParams: {},
      navigationStack: [{ screen: 'home', params: {}, lastFocusKey: null }],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders search input and empty state', () => {
    render(<SearchPage />);
    const input = screen.getByPlaceholderText('Search...');
    expect(input).toBeDefined();
    expect(screen.getByText('Type to search movies, series, and more')).toBeDefined();
  });

  it('debounces search input and shows results', async () => {
    const searchResults = [makeItem(1, 'Test Movie'), makeItem(2, 'Another Film')];

    const content = await import('../api/content');
    vi.mocked(content.searchItems).mockResolvedValue(makePaginatedResponse(searchResults));

    render(<SearchPage />);

    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(vi.mocked(content.searchItems)).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);

    await waitFor(() => {
      expect(vi.mocked(content.searchItems)).toHaveBeenCalledWith('test');
    });

    await waitFor(() => {
      expect(screen.getByText('Test Movie')).toBeDefined();
      expect(screen.getByText('Another Film')).toBeDefined();
    });
  });

  it('shows nothing found when search returns empty', async () => {
    const content = await import('../api/content');
    vi.mocked(content.searchItems).mockResolvedValue(makePaginatedResponse([]));

    render(<SearchPage />);

    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'nonexistent' } });

    vi.advanceTimersByTime(500);

    await waitFor(() => {
      expect(screen.getByText('Nothing found')).toBeDefined();
    });
  });

  it('shows error state on search failure', async () => {
    const content = await import('../api/content');
    vi.mocked(content.searchItems).mockRejectedValue(new Error('Network error'));

    render(<SearchPage />);

    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'fail' } });

    vi.advanceTimersByTime(500);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeDefined();
    });
  });

  it('clears results when input is emptied', async () => {
    const content = await import('../api/content');
    vi.mocked(content.searchItems).mockResolvedValue(
      makePaginatedResponse([makeItem(1, 'Test Movie')]),
    );

    render(<SearchPage />);

    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'test' } });
    vi.advanceTimersByTime(500);

    await waitFor(() => {
      expect(screen.getByText('Test Movie')).toBeDefined();
    });

    fireEvent.change(input, { target: { value: '' } });
    vi.advanceTimersByTime(500);

    await waitFor(() => {
      expect(screen.queryByText('Test Movie')).toBeNull();
      expect(screen.getByText('Type to search movies, series, and more')).toBeDefined();
    });
  });

  it('shows loading skeleton while searching', async () => {
    const deferred = new Deferred();
    const content = await import('../api/content');
    vi.mocked(content.searchItems).mockImplementation(() => deferred.promise);

    const { container } = render(<SearchPage />);

    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'test' } });
    vi.advanceTimersByTime(500);

    await waitFor(() => {
      const skeletons = container.querySelectorAll('[class*="posterCard"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    deferred.resolve(makePaginatedResponse([makeItem(1, 'Result')]));

    await waitFor(() => {
      expect(screen.getByText('Result')).toBeDefined();
    });
  });

  it('discards stale responses from earlier queries', async () => {
    const deferredFirst = new Deferred();
    const deferredSecond = new Deferred();
    let callCount = 0;

    const content = await import('../api/content');
    vi.mocked(content.searchItems).mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) return deferredFirst.promise;
      return deferredSecond.promise;
    });

    render(<SearchPage />);

    const input = screen.getByPlaceholderText('Search...');

    fireEvent.change(input, { target: { value: 'te' } });
    vi.advanceTimersByTime(500);

    await waitFor(() => {
      expect(vi.mocked(content.searchItems)).toHaveBeenCalledWith('te');
    });

    fireEvent.change(input, { target: { value: 'test' } });
    vi.advanceTimersByTime(500);

    await waitFor(() => {
      expect(vi.mocked(content.searchItems)).toHaveBeenCalledWith('test');
    });

    deferredSecond.resolve(makePaginatedResponse([makeItem(10, 'Correct Result')]));

    await waitFor(() => {
      expect(screen.getByText('Correct Result')).toBeDefined();
    });

    deferredFirst.resolve(makePaginatedResponse([makeItem(20, 'Stale Result')]));

    await waitFor(() => {
      expect(screen.getByText('Correct Result')).toBeDefined();
      expect(screen.queryByText('Stale Result')).toBeNull();
    });
  });
});
