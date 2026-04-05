import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import { PosterCard } from './PosterCard';
import type { Item } from '../types';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 1,
    title: 'Test Movie',
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
    plot: 'A test plot',
    imdb: 12345,
    imdb_rating: 7.5,
    imdb_votes: 1000,
    kinopoisk: 67890,
    kinopoisk_rating: 8.1,
    kinopoisk_votes: 2000,
    rating: 80,
    rating_votes: 500,
    rating_percentage: 80,
    views: 10000,
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
    genres: [],
    countries: [],
    bookmarks: [],
    ...overrides,
  };
}

describe('PosterCard', () => {
  beforeEach(() => {
    init({ debug: false, visualDebug: false });
  });

  it('renders item title and year', () => {
    const item = makeItem({ title: 'Inception', year: 2010 });
    render(
      <PosterCard
        item={item}
        shouldLoadImage={true}
        onSelect={vi.fn()}
        onFocus={vi.fn()}
      />,
    );
    expect(screen.getByText('Inception')).toBeDefined();
    expect(screen.getByText('2010')).toBeDefined();
  });

  it('renders image when in viewport', () => {
    const item = makeItem();
    const { container } = render(
      <PosterCard
        item={item}
        shouldLoadImage={true}
        onSelect={vi.fn()}
        onFocus={vi.fn()}
      />,
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://example.com/medium.jpg');
    expect(img?.getAttribute('width')).toBe('250');
    expect(img?.getAttribute('height')).toBe('375');
  });

  it('does not render image when not in viewport', () => {
    const item = makeItem();
    const { container } = render(
      <PosterCard
        item={item}
        shouldLoadImage={false}
        onSelect={vi.fn()}
        onFocus={vi.fn()}
      />,
    );
    const img = container.querySelector('img');
    expect(img).toBeNull();
  });

  it('shows kinopoisk rating when available', () => {
    const item = makeItem({ kinopoisk_rating: 8.1, imdb_rating: 7.5 });
    render(
      <PosterCard
        item={item}
        shouldLoadImage={true}
        onSelect={vi.fn()}
        onFocus={vi.fn()}
      />,
    );
    expect(screen.getByText('8.1')).toBeDefined();
  });

  it('shows imdb rating when kinopoisk is 0', () => {
    const item = makeItem({ kinopoisk_rating: 0, imdb_rating: 7.5 });
    render(
      <PosterCard
        item={item}
        shouldLoadImage={true}
        onSelect={vi.fn()}
        onFocus={vi.fn()}
      />,
    );
    expect(screen.getByText('7.5')).toBeDefined();
  });

  it('shows no rating badge when both ratings are 0', () => {
    const item = makeItem({ kinopoisk_rating: 0, imdb_rating: 0 });
    const { container } = render(
      <PosterCard
        item={item}
        shouldLoadImage={true}
        onSelect={vi.fn()}
        onFocus={vi.fn()}
      />,
    );
    const badges = container.querySelectorAll('[class*="ratingBadge"]');
    expect(badges.length).toBe(0);
  });

  it('sets explicit width and height on image', () => {
    const item = makeItem();
    const { container } = render(
      <PosterCard
        item={item}
        shouldLoadImage={true}
        onSelect={vi.fn()}
        onFocus={vi.fn()}
      />,
    );
    const img = container.querySelector('img');
    expect(img?.getAttribute('width')).toBe('250');
    expect(img?.getAttribute('height')).toBe('375');
  });
});
