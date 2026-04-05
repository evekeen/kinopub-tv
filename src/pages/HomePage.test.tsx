import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import { HomePage } from './HomePage';
import { useAuthStore } from '../store/auth';
import { useUiStore } from '../store/ui';
import type { Item } from '../types';

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

vi.mock('../api/content', () => ({
  getFresh: vi.fn(),
  getHot: vi.fn(),
  getPopular: vi.fn(),
}));

vi.mock('../api/watching', () => ({
  getWatchingSerials: vi.fn(),
  getWatchingMovies: vi.fn(),
}));

describe('HomePage', () => {
  beforeEach(async () => {
    init({ debug: false, visualDebug: false });
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'test-token' });
    useUiStore.setState({
      currentScreen: 'home',
      screenParams: {},
      navigationStack: [],
    });

    const freshItems = [makeItem(1, 'Fresh Movie'), makeItem(2, 'Fresh Film')];
    const hotItems = [makeItem(3, 'Hot Movie'), makeItem(4, 'Hot Film')];
    const popularItems = [makeItem(5, 'Popular Movie')];

    const content = await import('../api/content');
    vi.mocked(content.getFresh).mockResolvedValue({
      status: 200,
      items: freshItems,
      pagination: { total: 1, current: 1, perpage: 20, total_items: 2 },
    });
    vi.mocked(content.getHot).mockResolvedValue({
      status: 200,
      items: hotItems,
      pagination: { total: 1, current: 1, perpage: 20, total_items: 2 },
    });
    vi.mocked(content.getPopular).mockResolvedValue({
      status: 200,
      items: popularItems,
      pagination: { total: 1, current: 1, perpage: 20, total_items: 1 },
    });

    const watching = await import('../api/watching');
    vi.mocked(watching.getWatchingSerials).mockResolvedValue({
      status: 200,
      items: [],
    });
    vi.mocked(watching.getWatchingMovies).mockResolvedValue({
      status: 200,
      items: [],
    });
  });

  it('renders loading skeleton initially', () => {
    const { container } = render(<HomePage />);
    const skeletons = container.querySelectorAll('[class*="skeletonTitle"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders visible content rails after loading', async () => {
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Fresh')).toBeDefined();
    });

    expect(screen.getByText('Hot')).toBeDefined();
  });

  it('renders items from visible rails', async () => {
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Fresh Movie')).toBeDefined();
    });

    expect(screen.getByText('Hot Movie')).toBeDefined();
  });

  it('virtualizes rails outside visible range', async () => {
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Fresh')).toBeDefined();
    });

    expect(screen.queryByText('Popular Movie')).toBeNull();
  });

  it('does not render continue watching rail when empty', async () => {
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Fresh')).toBeDefined();
    });

    expect(screen.queryByText('Continue Watching')).toBeNull();
  });

  it('shows error when all primary rails fail', async () => {
    const content = await import('../api/content');
    vi.mocked(content.getFresh).mockRejectedValueOnce(new Error('fail'));
    vi.mocked(content.getHot).mockRejectedValueOnce(new Error('fail'));
    vi.mocked(content.getPopular).mockRejectedValueOnce(new Error('fail'));

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('No content available')).toBeDefined();
    });
  });

  it('still renders when one rail fails but others succeed', async () => {
    const content = await import('../api/content');
    vi.mocked(content.getFresh).mockRejectedValueOnce(new Error('fail'));

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Hot')).toBeDefined();
    });

    expect(screen.queryByText('Fresh')).toBeNull();
  });
});
