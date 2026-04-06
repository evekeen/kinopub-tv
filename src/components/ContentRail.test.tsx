import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import { ContentRail } from './ContentRail';
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

describe('ContentRail', () => {
  beforeEach(() => {
    init({ debug: false, visualDebug: false });
  });

  it('renders rail title', () => {
    const items = [makeItem(1, 'Movie 1'), makeItem(2, 'Movie 2')];
    render(
      <ContentRail
        title="Fresh Releases"
        items={items}
        onSelectItem={vi.fn()}
        railFocusKey="test-rail"
      />,
    );
    expect(screen.getByText('Fresh Releases')).toBeDefined();
  });

  it('renders poster cards for items', () => {
    const items = [
      makeItem(1, 'Movie A'),
      makeItem(2, 'Movie B'),
      makeItem(3, 'Movie C'),
    ];
    render(
      <ContentRail
        title="Test Rail"
        items={items}
        onSelectItem={vi.fn()}
        railFocusKey="test-rail"
      />,
    );
    expect(screen.getByText('Movie A')).toBeDefined();
    expect(screen.getByText('Movie B')).toBeDefined();
    expect(screen.getByText('Movie C')).toBeDefined();
  });

  it('renders with empty items array', () => {
    render(
      <ContentRail
        title="Empty Rail"
        items={[]}
        onSelectItem={vi.fn()}
        railFocusKey="test-empty"
      />,
    );
    expect(screen.getByText('Empty Rail')).toBeDefined();
  });

  it('renders items within visible buffer', () => {
    const items = Array.from({ length: 20 }, (_, i) =>
      makeItem(i + 1, 'Item ' + (i + 1)),
    );
    render(
      <ContentRail
        title="Long Rail"
        items={items}
        onSelectItem={vi.fn()}
        railFocusKey="test-long"
      />,
    );
    expect(screen.getByText('Item 1')).toBeDefined();
    expect(screen.getByText('Item 9')).toBeDefined();
    expect(screen.queryByText('Item 10')).toBeNull();
  });

  it('uses translateX for GPU-composited scrolling', () => {
    const items = [makeItem(1, 'Movie 1')];
    const { container } = render(
      <ContentRail
        title="Test"
        items={items}
        onSelectItem={vi.fn()}
        railFocusKey="test-scroll"
      />,
    );
    const track = container.querySelector('[class*="track"]');
    expect(track).not.toBeNull();
    const style = track?.getAttribute('style');
    expect(style).toContain('transform');
    expect(style).toContain('translateX');
  });
});
