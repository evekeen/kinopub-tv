import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import { ContentPage } from './ContentPage';
import { useUiStore } from '../store/ui';
import type { ItemDetails, BookmarkFolder } from '../types';

function makeMovieDetails(overrides?: Partial<ItemDetails>): ItemDetails {
  return {
    id: 42,
    title: 'Test Movie',
    type: 'movie',
    subtype: null,
    year: 2024,
    cast: 'Actor One, Actor Two',
    director: 'Director Name',
    voice: '',
    duration: { average: 7200, total: 7200 },
    langs: 2,
    ac3: 1,
    quality: 1080,
    poor_quality: false,
    plot: 'A thrilling test movie about testing.',
    imdb: 12345,
    imdb_rating: 7.5,
    imdb_votes: 10000,
    kinopoisk: 67890,
    kinopoisk_rating: 8.1,
    kinopoisk_votes: 5000,
    rating: 0,
    rating_votes: 0,
    rating_percentage: 0,
    views: 1000,
    comments: 50,
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
    genres: [
      { id: 1, title: 'Action', type: 'movie' },
      { id: 2, title: 'Drama', type: 'movie' },
    ],
    countries: [{ id: 1, title: 'USA' }],
    bookmarks: [],
    videos: [
      {
        id: 100,
        title: 'Test Movie',
        number: 1,
        snumber: 1,
        thumbnail: '',
        duration: 7200,
        watched: -1,
        watching: { status: -1, time: 0 },
        tracks: 2,
        ac3: 1,
        audios: [],
        subtitles: [],
      },
    ],
    ...overrides,
  };
}

function makeSerialDetails(): ItemDetails {
  return makeMovieDetails({
    id: 43,
    title: 'Test Serial',
    type: 'serial',
    videos: undefined,
    seasons: [
      {
        id: 10,
        number: 1,
        title: 'Season 1',
        watched: 0,
        watching: { status: 0, time: 0 },
        episodes: [
          {
            id: 201,
            title: 'Pilot',
            number: 1,
            snumber: 1,
            thumbnail: 'https://example.com/thumb1.jpg',
            duration: 3600,
            watched: 1,
            watching: { status: 1, time: 3600 },
            tracks: 2,
            ac3: 0,
            audios: [],
            subtitles: [],
          },
          {
            id: 202,
            title: 'Second Episode',
            number: 2,
            snumber: 1,
            thumbnail: 'https://example.com/thumb2.jpg',
            duration: 3000,
            watched: -1,
            watching: { status: -1, time: 0 },
            tracks: 2,
            ac3: 0,
            audios: [],
            subtitles: [],
          },
        ],
      },
      {
        id: 11,
        number: 2,
        title: 'Season 2',
        watched: -1,
        watching: { status: -1, time: 0 },
        episodes: [
          {
            id: 301,
            title: 'Season 2 Premiere',
            number: 1,
            snumber: 2,
            thumbnail: '',
            duration: 3200,
            watched: -1,
            watching: { status: -1, time: 0 },
            tracks: 1,
            ac3: 0,
            audios: [],
            subtitles: [],
          },
        ],
      },
    ],
  });
}

const mockFolders: BookmarkFolder[] = [
  { id: 1, title: 'Favorites', views: 0, count: 5, created: 1700000000, updated: 1700000000 },
];

vi.mock('../api/content', () => ({
  getItemDetail: vi.fn(),
}));

vi.mock('../api/bookmarks', () => ({
  getFolders: vi.fn(),
  addItem: vi.fn(),
  removeItem: vi.fn(),
}));

describe('ContentPage', () => {
  beforeEach(async () => {
    init({ debug: false, visualDebug: false });
    useUiStore.setState({
      currentScreen: 'content',
      screenParams: { contentId: 42 },
      navigationStack: [{ screen: 'home', params: {}, lastFocusKey: 'home-page' }],
    });

    const content = await import('../api/content');
    vi.mocked(content.getItemDetail).mockResolvedValue({
      status: 200,
      item: makeMovieDetails(),
    });

    const bookmarks = await import('../api/bookmarks');
    vi.mocked(bookmarks.getFolders).mockResolvedValue({
      status: 200,
      items: mockFolders,
    });
    vi.mocked(bookmarks.addItem).mockResolvedValue({ status: 200 });
    vi.mocked(bookmarks.removeItem).mockResolvedValue({ status: 200 });
  });

  it('shows loading skeleton initially', () => {
    const { container } = render(<ContentPage />);
    const skeleton = container.querySelector('[class*="skeletonPoster"]');
    expect(skeleton).not.toBeNull();
  });

  it('renders movie details after loading', async () => {
    render(<ContentPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Movie')).toBeDefined();
    });

    expect(screen.getByText('2024')).toBeDefined();
    expect(screen.getByText('USA')).toBeDefined();
    expect(screen.getByText('Action, Drama')).toBeDefined();
    expect(screen.getByText('A thrilling test movie about testing.')).toBeDefined();
  });

  it('renders ratings for movie', async () => {
    render(<ContentPage />);

    await waitFor(() => {
      expect(screen.getByText('KP 8.1')).toBeDefined();
    });

    expect(screen.getByText('IMDb 7.5')).toBeDefined();
  });

  it('renders director and cast', async () => {
    render(<ContentPage />);

    await waitFor(() => {
      expect(screen.getByText('Director Name')).toBeDefined();
    });

    expect(screen.getByText('Actor One, Actor Two')).toBeDefined();
  });

  it('renders Play button for movies', async () => {
    render(<ContentPage />);

    await waitFor(() => {
      expect(screen.getByText('Play')).toBeDefined();
    });
  });

  it('renders Bookmark button', async () => {
    render(<ContentPage />);

    await waitFor(() => {
      expect(screen.getByText('Bookmark')).toBeDefined();
    });
  });

  it('shows Bookmarked state when item has bookmarks', async () => {
    const content = await import('../api/content');
    vi.mocked(content.getItemDetail).mockResolvedValue({
      status: 200,
      item: makeMovieDetails({
        bookmarks: [{ id: 1, title: 'Favorites' }],
      }),
    });

    render(<ContentPage />);

    await waitFor(() => {
      expect(screen.getByText('Bookmarked')).toBeDefined();
    });
  });

  it('renders poster image with big poster URL', async () => {
    render(<ContentPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Movie')).toBeDefined();
    });

    const img = screen.getByAltText('Test Movie');
    expect(img).toBeDefined();
    expect((img as HTMLImageElement).src).toContain('big.jpg');
  });

  it('shows error state on API failure', async () => {
    const content = await import('../api/content');
    vi.mocked(content.getItemDetail).mockRejectedValue(new Error('Network failure'));

    render(<ContentPage />);

    await waitFor(() => {
      expect(screen.getByText('Network failure')).toBeDefined();
    });
  });

  it('shows error when contentId is missing', async () => {
    useUiStore.setState({
      currentScreen: 'content',
      screenParams: {},
      navigationStack: [{ screen: 'home', params: {}, lastFocusKey: 'home-page' }],
    });

    render(<ContentPage />);

    await waitFor(() => {
      expect(screen.getByText('No content ID provided')).toBeDefined();
    });
  });

  it('shows error when getFolders fails', async () => {
    const bookmarks = await import('../api/bookmarks');
    vi.mocked(bookmarks.getFolders).mockRejectedValue(new Error('Folders failed'));

    render(<ContentPage />);

    await waitFor(() => {
      expect(screen.getByText('Folders failed')).toBeDefined();
    });
  });

  it('renders episode list for serial type', async () => {
    const content = await import('../api/content');
    vi.mocked(content.getItemDetail).mockResolvedValue({
      status: 200,
      item: makeSerialDetails(),
    });
    useUiStore.setState({
      currentScreen: 'content',
      screenParams: { contentId: 43 },
      navigationStack: [{ screen: 'home', params: {}, lastFocusKey: 'home-page' }],
    });

    render(<ContentPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Serial')).toBeDefined();
    });

    expect(screen.getByText('Season 1')).toBeDefined();
    expect(screen.getByText('Season 2')).toBeDefined();
    expect(screen.getByText('Pilot')).toBeDefined();
    expect(screen.getByText('Second Episode')).toBeDefined();
  });

  it('does not render Play button for serials', async () => {
    const content = await import('../api/content');
    vi.mocked(content.getItemDetail).mockResolvedValue({
      status: 200,
      item: makeSerialDetails(),
    });
    useUiStore.setState({
      currentScreen: 'content',
      screenParams: { contentId: 43 },
      navigationStack: [{ screen: 'home', params: {}, lastFocusKey: 'home-page' }],
    });

    render(<ContentPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Serial')).toBeDefined();
    });

    expect(screen.queryByText('Play')).toBeNull();
  });

  it('renders duration in human-readable format', async () => {
    render(<ContentPage />);

    await waitFor(() => {
      expect(screen.getByText('2h')).toBeDefined();
    });
  });

  it('handles concert type as movie kind', async () => {
    const content = await import('../api/content');
    vi.mocked(content.getItemDetail).mockResolvedValue({
      status: 200,
      item: makeMovieDetails({ type: 'concert', title: 'Test Concert' }),
    });

    render(<ContentPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Concert')).toBeDefined();
    });

    expect(screen.getByText('Play')).toBeDefined();
  });

  it('handles tvshow type as serial kind', async () => {
    const content = await import('../api/content');
    vi.mocked(content.getItemDetail).mockResolvedValue({
      status: 200,
      item: makeSerialDetails(),
    });
    useUiStore.setState({
      currentScreen: 'content',
      screenParams: { contentId: 43 },
      navigationStack: [{ screen: 'home', params: {}, lastFocusKey: 'home-page' }],
    });

    render(<ContentPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Serial')).toBeDefined();
    });

    expect(screen.queryByText('Play')).toBeNull();
  });

  it('falls back to medium poster when big is empty', async () => {
    const content = await import('../api/content');
    vi.mocked(content.getItemDetail).mockResolvedValue({
      status: 200,
      item: makeMovieDetails({
        posters: { small: 'https://example.com/small.jpg', medium: 'https://example.com/medium.jpg', big: '' },
      }),
    });

    render(<ContentPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Movie')).toBeDefined();
    });

    const img = screen.getByAltText('Test Movie');
    expect((img as HTMLImageElement).src).toContain('medium.jpg');
  });
});
