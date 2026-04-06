import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRemoteKeys } from './useRemoteKeys';
import type { RemoteKeyMap } from './useRemoteKeys';
import { resetThrottleState } from './useThrottledKey';

function fireKey(keyCode: number, key: string): void {
  window.dispatchEvent(
    new KeyboardEvent('keydown', { keyCode, key, bubbles: true }),
  );
}

describe('useRemoteKeys', () => {
  beforeEach(() => {
    resetThrottleState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls playPause handler on MediaPlayPause key (415)', () => {
    const playPause = vi.fn();
    const handlers: RemoteKeyMap = { playPause };

    renderHook(() => useRemoteKeys(handlers));
    fireKey(415, 'MediaPlayPause');

    expect(playPause).toHaveBeenCalledOnce();
  });

  it('calls back handler on Tizen back key (10009)', () => {
    const back = vi.fn();
    const handlers: RemoteKeyMap = { back };

    renderHook(() => useRemoteKeys(handlers));
    fireKey(10009, '');

    expect(back).toHaveBeenCalledOnce();
  });

  it('calls back handler on Backspace key', () => {
    const back = vi.fn();
    const handlers: RemoteKeyMap = { back };

    renderHook(() => useRemoteKeys(handlers));
    fireKey(8, 'Backspace');

    expect(back).toHaveBeenCalledOnce();
  });

  it('calls left/right handlers on arrow keys', () => {
    const left = vi.fn();
    const right = vi.fn();
    const handlers: RemoteKeyMap = { left, right };

    renderHook(() => useRemoteKeys(handlers));
    fireKey(37, 'ArrowLeft');
    fireKey(39, 'ArrowRight');

    expect(left).toHaveBeenCalledOnce();
    expect(right).toHaveBeenCalledOnce();
  });

  it('calls enter handler on Enter key (13)', () => {
    const enter = vi.fn();
    const handlers: RemoteKeyMap = { enter };

    renderHook(() => useRemoteKeys(handlers));
    fireKey(13, 'Enter');

    expect(enter).toHaveBeenCalledOnce();
  });

  it('calls fastForward handler on key 417', () => {
    const fastForward = vi.fn();
    const handlers: RemoteKeyMap = { fastForward };

    renderHook(() => useRemoteKeys(handlers));
    fireKey(417, 'MediaFastForward');

    expect(fastForward).toHaveBeenCalledOnce();
  });

  it('calls rewind handler on key 412', () => {
    const rewind = vi.fn();
    const handlers: RemoteKeyMap = { rewind };

    renderHook(() => useRemoteKeys(handlers));
    fireKey(412, 'MediaRewind');

    expect(rewind).toHaveBeenCalledOnce();
  });

  it('calls channelUp/Down handlers', () => {
    const channelUp = vi.fn();
    const channelDown = vi.fn();
    const handlers: RemoteKeyMap = { channelUp, channelDown };

    renderHook(() => useRemoteKeys(handlers));
    fireKey(427, '');
    fireKey(428, '');

    expect(channelUp).toHaveBeenCalledOnce();
    expect(channelDown).toHaveBeenCalledOnce();
  });

  it('does not call handler for unregistered action', () => {
    const enter = vi.fn();
    const handlers: RemoteKeyMap = { enter };

    renderHook(() => useRemoteKeys(handlers));
    fireKey(37, 'ArrowLeft');

    expect(enter).not.toHaveBeenCalled();
  });

  it('ignores unknown key codes', () => {
    const back = vi.fn();
    const handlers: RemoteKeyMap = { back };

    renderHook(() => useRemoteKeys(handlers));
    fireKey(999, 'SomeRandomKey');

    expect(back).not.toHaveBeenCalled();
  });

  it('cleans up event listener on unmount', () => {
    const playPause = vi.fn();
    const handlers: RemoteKeyMap = { playPause };

    const { unmount } = renderHook(() => useRemoteKeys(handlers));
    unmount();
    fireKey(415, 'MediaPlayPause');

    expect(playPause).not.toHaveBeenCalled();
  });
});
