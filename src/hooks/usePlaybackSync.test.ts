import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePlaybackSync } from './usePlaybackSync';

vi.mock('../api/watching', () => ({
  markTime: vi.fn(() => Promise.resolve({ status: 200, message: 'ok' })),
}));

import { markTime } from '../api/watching';

describe('usePlaybackSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call markTime when not playing and currentTime is 0', () => {
    const getCurrentTime = vi.fn(() => 0);

    renderHook(() => usePlaybackSync(1, 2, getCurrentTime, false));
    vi.advanceTimersByTime(35000);

    expect(markTime).not.toHaveBeenCalled();
  });

  it('does not call markTime when itemId is undefined', () => {
    const getCurrentTime = vi.fn(() => 120);

    renderHook(() => usePlaybackSync(undefined, 2, getCurrentTime, true));
    vi.advanceTimersByTime(35000);

    expect(markTime).not.toHaveBeenCalled();
  });

  it('does not call markTime when videoNumber is undefined', () => {
    const getCurrentTime = vi.fn(() => 120);

    renderHook(() => usePlaybackSync(1, undefined, getCurrentTime, true));
    vi.advanceTimersByTime(35000);

    expect(markTime).not.toHaveBeenCalled();
  });

  it('calls markTime after 30 seconds when playing', () => {
    const getCurrentTime = vi.fn(() => 120);

    renderHook(() => usePlaybackSync(1, 2, getCurrentTime, true));
    vi.advanceTimersByTime(30000);

    expect(markTime).toHaveBeenCalledWith(1, 2, 120, undefined);
  });

  it('calls markTime multiple times at 30s intervals', () => {
    let time = 100;
    const getCurrentTime = vi.fn(() => time);

    renderHook(() => usePlaybackSync(1, 2, getCurrentTime, true));

    vi.advanceTimersByTime(30000);
    expect(markTime).toHaveBeenCalledTimes(1);

    time = 130;
    vi.advanceTimersByTime(30000);
    expect(markTime).toHaveBeenCalledTimes(2);
    expect(markTime).toHaveBeenCalledWith(1, 2, 130, undefined);
  });

  it('does not call markTime when currentTime is 0', () => {
    const getCurrentTime = vi.fn(() => 0);

    renderHook(() => usePlaybackSync(1, 2, getCurrentTime, true));
    vi.advanceTimersByTime(30000);

    expect(markTime).not.toHaveBeenCalled();
  });

  it('calls markTime on unmount if time > 0', () => {
    const getCurrentTime = vi.fn(() => 250);

    const { unmount } = renderHook(() =>
      usePlaybackSync(1, 2, getCurrentTime, true),
    );
    unmount();

    expect(markTime).toHaveBeenCalledWith(1, 2, 250, undefined);
  });

  it('calls markTime when playback pauses', () => {
    const getCurrentTime = vi.fn(() => 180);
    let isPlaying = true;

    const { rerender } = renderHook(() =>
      usePlaybackSync(1, 2, getCurrentTime, isPlaying),
    );

    expect(markTime).not.toHaveBeenCalled();

    isPlaying = false;
    rerender();

    expect(markTime).toHaveBeenCalledWith(1, 2, 180, undefined);
  });

  it('does not duplicate markTime when paused then unmounted', () => {
    const getCurrentTime = vi.fn(() => 300);
    let isPlaying = true;

    const { rerender, unmount } = renderHook(() =>
      usePlaybackSync(1, 2, getCurrentTime, isPlaying),
    );

    isPlaying = false;
    rerender();
    expect(markTime).toHaveBeenCalledTimes(1);

    unmount();
    expect(markTime).toHaveBeenCalledTimes(1);
  });

  it('passes seasonNumber to markTime for serial episodes', () => {
    const getCurrentTime = vi.fn(() => 120);
    renderHook(() => usePlaybackSync(42, 3, getCurrentTime, true, 2));
    vi.advanceTimersByTime(30000);
    expect(markTime).toHaveBeenCalledWith(42, 3, 120, 2);
  });

  it('passes a small 1-based video number, not a server-side ID (regression guard)', () => {
    const getCurrentTime = vi.fn(() => 60);
    renderHook(() => usePlaybackSync(42, 3, getCurrentTime, true, 2));
    vi.advanceTimersByTime(30000);
    const videoArg = vi.mocked(markTime).mock.calls[0][1];
    expect(videoArg).toBe(3);
  });
});
