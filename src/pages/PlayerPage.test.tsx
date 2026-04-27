import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import { PlayerPage } from './PlayerPage';
import { useUiStore } from '../store/ui';
import type { MediaLinks } from '../types';

const fakeVideo = document.createElement('video');
let mockCurrentTime = 0;
let mockDuration = 0;
let mockReadyState = 4;

Object.defineProperty(fakeVideo, 'currentTime', {
  get: () => mockCurrentTime,
  set: (v: number) => {
    mockCurrentTime = v;
  },
  configurable: true,
});
Object.defineProperty(fakeVideo, 'duration', {
  get: () => mockDuration,
  set: (v: number) => {
    mockDuration = v;
  },
  configurable: true,
});
Object.defineProperty(fakeVideo, 'readyState', {
  get: () => mockReadyState,
  configurable: true,
});

vi.mock('../api/watching', () => ({
  toggleWatched: vi.fn(() => Promise.resolve({ status: 200, message: 'ok' })),
  markTime: vi.fn(() => Promise.resolve({ status: 200, message: 'ok' })),
}));

vi.mock('../api/media', () => ({
  getMediaLinks: vi.fn(),
}));

vi.mock('../contexts/PlayerContext', () => ({
  usePlayerContext: () => ({
    videoRef: { current: fakeVideo },
    loadSource: vi.fn(),
    destroy: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    seek: vi.fn(),
    getAudioTracks: () => [],
    setAudioTrack: vi.fn(),
    hlsError: null,
    retryLoad: vi.fn(),
  }),
}));

vi.mock('../hooks/useSubtitles', () => ({
  useSubtitles: () => ({
    currentCue: null,
    loading: false,
    error: null,
    loadSubtitle: vi.fn(),
    clearSubtitle: vi.fn(),
  }),
}));

vi.mock('../hooks/usePlaybackSync', () => ({
  usePlaybackSync: vi.fn(),
}));
import { usePlaybackSync } from '../hooks/usePlaybackSync';

vi.mock('../components/Player/PlayerOverlay', () => ({
  PlayerOverlay: () => null,
}));

vi.mock('../components/Player/SubtitleRenderer', () => ({
  SubtitleRenderer: () => null,
}));

import { toggleWatched } from '../api/watching';
import { getMediaLinks } from '../api/media';

const MEDIA_LINKS: MediaLinks = {
  id: 99999,
  thumbnail: '',
  files: [
    {
      codec: 'h264',
      w: 1920,
      h: 1080,
      quality: '1080p',
      quality_id: 4,
      file: '',
      url: { http: '', hls: 'https://example.com/stream.m3u8' },
    },
  ],
  subtitles: [],
};

function setEpisodeParams(alreadyWatched: boolean = false): void {
  useUiStore.setState({
    currentScreen: 'player',
    screenParams: {
      contentId: 42,
      mediaId: 99999,
      seasonNumber: 2,
      episodeNumber: 3,
      alreadyWatched,
    },
    navigationStack: [
      { screen: 'content', params: { contentId: 42 }, lastFocusKey: null },
    ],
  });
}

function setMovieParams(): void {
  useUiStore.setState({
    currentScreen: 'player',
    screenParams: {
      contentId: 42,
      mediaId: 99999,
      alreadyWatched: false,
    },
    navigationStack: [
      { screen: 'content', params: { contentId: 42 }, lastFocusKey: null },
    ],
  });
}

async function fireTimeUpdate(currentTime: number, duration: number): Promise<void> {
  mockCurrentTime = currentTime;
  mockDuration = duration;
  await act(async () => {
    fakeVideo.dispatchEvent(new Event('timeupdate'));
  });
}

describe('PlayerPage 90% auto-mark', () => {
  let renderResult: ReturnType<typeof render> | null = null;

  beforeEach(async () => {
    init({ debug: false, visualDebug: false });
    vi.mocked(toggleWatched).mockClear();
    vi.mocked(getMediaLinks).mockResolvedValue(MEDIA_LINKS);
    mockCurrentTime = 0;
    mockDuration = 0;
    mockReadyState = 4;
    setEpisodeParams();
  });

  afterEach(() => {
    if (renderResult !== null) {
      renderResult.unmount();
      renderResult = null;
    }
  });

  it('fires toggleWatched once at 90% with (itemId, episodeNumber, seasonNumber, 1)', async () => {
    await act(async () => {
      renderResult = render(<PlayerPage />);
    });
    await waitFor(() => {
      expect(getMediaLinks).toHaveBeenCalled();
    });

    await fireTimeUpdate(891, 990);

    expect(toggleWatched).toHaveBeenCalledTimes(1);
    expect(toggleWatched).toHaveBeenCalledWith(42, 3, 2, 1);
  });

  it('does not fire below 90%', async () => {
    await act(async () => {
      renderResult = render(<PlayerPage />);
    });

    await fireTimeUpdate(800, 990);

    expect(toggleWatched).not.toHaveBeenCalled();
  });

  it('does not double-fire when crossing 90% repeatedly', async () => {
    await act(async () => {
      renderResult = render(<PlayerPage />);
    });

    await fireTimeUpdate(800, 990);
    await fireTimeUpdate(891, 990);
    await fireTimeUpdate(940, 990);

    expect(toggleWatched).toHaveBeenCalledTimes(1);
  });

  it('skips auto-mark when alreadyWatched is true', async () => {
    setEpisodeParams(true);

    await act(async () => {
      renderResult = render(<PlayerPage />);
    });

    await fireTimeUpdate(940, 990);

    expect(toggleWatched).not.toHaveBeenCalled();
  });

  it('uses video=1 for movies (episodeNumber undefined)', async () => {
    setMovieParams();

    await act(async () => {
      renderResult = render(<PlayerPage />);
    });

    await fireTimeUpdate(940, 990);

    expect(toggleWatched).toHaveBeenCalledWith(42, 1, undefined, 1);
  });

  it('passes episodeNumber (not mediaId) to usePlaybackSync for serial episodes', async () => {
    vi.mocked(usePlaybackSync).mockClear();

    await act(async () => {
      renderResult = render(<PlayerPage />);
    });

    const calls = vi.mocked(usePlaybackSync).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1];
    const videoNumberArg = lastCall[1];
    expect(videoNumberArg).toBe(3);
    expect(videoNumberArg).not.toBe(99999);
  });

});
