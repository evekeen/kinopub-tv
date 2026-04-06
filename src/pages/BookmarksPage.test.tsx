import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import { BookmarksPage } from './BookmarksPage';
import { useUiStore } from '../store/ui';
import { useAuthStore } from '../store/auth';
import type { Item, BookmarkFolder, ListResponse, PaginatedResponse } from '../types';

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

function makeFolder(id: number, title: string, count: number): BookmarkFolder {
  return {
    id,
    title,
    views: 0,
    count,
    created: 1700000000,
    updated: 1700000000,
  };
}

vi.mock('../api/bookmarks', () => ({
  getFolders: vi.fn(),
  getFolderItems: vi.fn(),
}));

describe('BookmarksPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    init({ debug: false, visualDebug: false });
    useAuthStore.setState({ isAuthenticated: true });
    useUiStore.setState({
      currentScreen: 'bookmarks',
      screenParams: {},
      navigationStack: [{ screen: 'home', params: {}, lastFocusKey: null }],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders folder list', async () => {
    const folders = [
      makeFolder(1, 'Favorites', 5),
      makeFolder(2, 'Watch Later', 3),
    ];

    const bookmarks = await import('../api/bookmarks');
    const response: ListResponse<BookmarkFolder> = { status: 200, items: folders };
    vi.mocked(bookmarks.getFolders).mockResolvedValue(response);

    render(<BookmarksPage />);

    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeDefined();
      expect(screen.getByText('Watch Later')).toBeDefined();
      expect(screen.getByText('5 items')).toBeDefined();
      expect(screen.getByText('3 items')).toBeDefined();
    });
  });

  it('shows empty state when no folders', async () => {
    const bookmarks = await import('../api/bookmarks');
    const response: ListResponse<BookmarkFolder> = { status: 200, items: [] };
    vi.mocked(bookmarks.getFolders).mockResolvedValue(response);

    render(<BookmarksPage />);

    await waitFor(() => {
      expect(screen.getByText('No bookmark folders')).toBeDefined();
    });
  });

  it('shows error state on load failure', async () => {
    const bookmarks = await import('../api/bookmarks');
    vi.mocked(bookmarks.getFolders).mockRejectedValue(new Error('Network error'));

    render(<BookmarksPage />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeDefined();
    });
  });

  it('shows folder items when folder is selected', async () => {
    const folders = [makeFolder(1, 'Favorites', 2)];
    const items = [makeItem(10, 'Movie A'), makeItem(20, 'Movie B')];

    const bookmarks = await import('../api/bookmarks');
    const foldersResponse: ListResponse<BookmarkFolder> = { status: 200, items: folders };
    vi.mocked(bookmarks.getFolders).mockResolvedValue(foldersResponse);

    const itemsResponse: PaginatedResponse<Item> = {
      status: 200,
      items,
      pagination: { total: 1, current: 1, perpage: 20, total_items: 2 },
    };
    vi.mocked(bookmarks.getFolderItems).mockResolvedValue(itemsResponse);

    render(<BookmarksPage />);

    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeDefined();
    });

    const folderElement = screen.getByText('Favorites');
    const folderRow = folderElement.closest('[class*="folder"]');
    expect(folderRow).not.toBeNull();

    fireEvent.keyDown(folderRow!, { key: 'Enter', keyCode: 13 });

    await waitFor(() => {
      expect(vi.mocked(bookmarks.getFolderItems)).toHaveBeenCalledWith(1);
    });

    await waitFor(() => {
      expect(screen.getByText('Movie A')).toBeDefined();
      expect(screen.getByText('Movie B')).toBeDefined();
    });
  });

  it('shows empty folder state', async () => {
    const folders = [makeFolder(1, 'Empty Folder', 0)];

    const bookmarks = await import('../api/bookmarks');
    const foldersResponse: ListResponse<BookmarkFolder> = { status: 200, items: folders };
    vi.mocked(bookmarks.getFolders).mockResolvedValue(foldersResponse);

    const itemsResponse: PaginatedResponse<Item> = {
      status: 200,
      items: [],
      pagination: { total: 1, current: 1, perpage: 20, total_items: 0 },
    };
    vi.mocked(bookmarks.getFolderItems).mockResolvedValue(itemsResponse);

    render(<BookmarksPage />);

    await waitFor(() => {
      expect(screen.getByText('Empty Folder')).toBeDefined();
    });

    const folderElement = screen.getByText('Empty Folder');
    const folderRow = folderElement.closest('[class*="folder"]');
    fireEvent.keyDown(folderRow!, { key: 'Enter', keyCode: 13 });

    await waitFor(() => {
      expect(screen.getByText('This folder is empty')).toBeDefined();
    });
  });

  it('renders page title', async () => {
    const bookmarks = await import('../api/bookmarks');
    const response: ListResponse<BookmarkFolder> = { status: 200, items: [] };
    vi.mocked(bookmarks.getFolders).mockResolvedValue(response);

    render(<BookmarksPage />);

    await waitFor(() => {
      expect(screen.getByText('Bookmarks')).toBeDefined();
    });
  });
});
