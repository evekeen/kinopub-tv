import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import { EpisodeList } from './EpisodeList';
import type { Season, Video } from '../types';

function makeEpisode(overrides?: Partial<Video>): Video {
  return {
    id: 1,
    title: 'Test Episode',
    number: 1,
    snumber: 1,
    thumbnail: 'https://example.com/thumb.jpg',
    duration: 3600,
    watched: -1,
    watching: { status: -1, time: 0 },
    tracks: 2,
    ac3: 0,
    audios: [],
    subtitles: [],
    ...overrides,
  };
}

function makeSeason(number: number, episodes: Video[]): Season {
  return {
    id: number,
    number,
    title: 'Season ' + number,
    episodes,
    watched: -1,
    watching: { status: -1, time: 0 },
  };
}

describe('EpisodeList', () => {
  const onSelectEpisode = vi.fn();

  beforeEach(() => {
    init({ debug: false, visualDebug: false });
    onSelectEpisode.mockReset();
  });

  it('renders episodes for single season', () => {
    const seasons = [
      makeSeason(1, [
        makeEpisode({ id: 1, title: 'Pilot', number: 1 }),
        makeEpisode({ id: 2, title: 'Episode Two', number: 2 }),
      ]),
    ];

    render(<EpisodeList seasons={seasons} onSelectEpisode={onSelectEpisode} />);

    expect(screen.getByText('Pilot')).toBeDefined();
    expect(screen.getByText('Episode Two')).toBeDefined();
  });

  it('does not show season tabs for single season', () => {
    const seasons = [
      makeSeason(1, [makeEpisode({ id: 1, title: 'Pilot', number: 1 })]),
    ];

    render(<EpisodeList seasons={seasons} onSelectEpisode={onSelectEpisode} />);

    expect(screen.queryByText('Season 1')).toBeNull();
  });

  it('shows season tabs for multiple seasons', () => {
    const seasons = [
      makeSeason(1, [makeEpisode({ id: 1, title: 'S1E1', number: 1 })]),
      makeSeason(2, [makeEpisode({ id: 2, title: 'S2E1', number: 1, snumber: 2 })]),
    ];

    render(<EpisodeList seasons={seasons} onSelectEpisode={onSelectEpisode} />);

    expect(screen.getByText('Season 1')).toBeDefined();
    expect(screen.getByText('Season 2')).toBeDefined();
  });

  it('shows episodes from first season by default', () => {
    const seasons = [
      makeSeason(1, [makeEpisode({ id: 1, title: 'S1E1', number: 1 })]),
      makeSeason(2, [makeEpisode({ id: 2, title: 'S2E1', number: 1, snumber: 2 })]),
    ];

    render(<EpisodeList seasons={seasons} onSelectEpisode={onSelectEpisode} />);

    expect(screen.getByText('S1E1')).toBeDefined();
    expect(screen.queryByText('S2E1')).toBeNull();
  });

  it('renders episode number labels', () => {
    const seasons = [
      makeSeason(1, [
        makeEpisode({ id: 1, title: 'Pilot', number: 1 }),
        makeEpisode({ id: 2, title: 'Second', number: 2 }),
      ]),
    ];

    render(<EpisodeList seasons={seasons} onSelectEpisode={onSelectEpisode} />);

    expect(screen.getByText('Episode 1')).toBeDefined();
    expect(screen.getByText('Episode 2')).toBeDefined();
  });

  it('renders episode duration', () => {
    const seasons = [
      makeSeason(1, [
        makeEpisode({ id: 1, title: 'Long Episode', number: 1, duration: 5400 }),
      ]),
    ];

    render(<EpisodeList seasons={seasons} onSelectEpisode={onSelectEpisode} />);

    expect(screen.getByText('1h 30m')).toBeDefined();
  });

  it('renders watched indicator for watched episodes', () => {
    const seasons = [
      makeSeason(1, [
        makeEpisode({ id: 1, title: 'Watched', number: 1, watched: 1 }),
        makeEpisode({ id: 2, title: 'Unwatched', number: 2, watched: -1 }),
      ]),
    ];

    const { container } = render(
      <EpisodeList seasons={seasons} onSelectEpisode={onSelectEpisode} />,
    );

    const watchedDots = container.querySelectorAll('[class*="watchedDone"]');
    const unwatchedDots = container.querySelectorAll('[class*="watchedNone"]');
    expect(watchedDots.length).toBe(1);
    expect(unwatchedDots.length).toBe(1);
  });

  it('renders thumbnail images', () => {
    const seasons = [
      makeSeason(1, [
        makeEpisode({ id: 1, title: 'With Thumb', number: 1, thumbnail: 'https://example.com/thumb.jpg' }),
      ]),
    ];

    render(<EpisodeList seasons={seasons} onSelectEpisode={onSelectEpisode} />);

    const img = screen.getByAltText('With Thumb');
    expect(img).toBeDefined();
  });

  it('uses episode number as title fallback when title is empty', () => {
    const seasons = [
      makeSeason(1, [
        makeEpisode({ id: 1, title: '', number: 5 }),
      ]),
    ];

    render(<EpisodeList seasons={seasons} onSelectEpisode={onSelectEpisode} />);

    const matches = screen.getAllByText('Episode 5');
    expect(matches.length).toBe(2);
  });

  it('virtualizes episodes within visible buffer', () => {
    const episodes: Video[] = [];
    for (let i = 1; i <= 24; i++) {
      episodes.push(makeEpisode({ id: i, title: 'Ep ' + i, number: i }));
    }
    const seasons = [makeSeason(1, episodes)];

    render(<EpisodeList seasons={seasons} onSelectEpisode={onSelectEpisode} />);

    expect(screen.getByText('Ep 1')).toBeDefined();
    expect(screen.getByText('Ep 6')).toBeDefined();
    expect(screen.queryByText('Ep 7')).toBeNull();
  });
});
