import { describe, it, expect, beforeEach } from 'vitest';
import { shouldThrottleKey, resetThrottleState } from './useThrottledKey';

describe('shouldThrottleKey', () => {
  beforeEach(() => {
    resetThrottleState();
  });

  it('does not throttle media keys', () => {
    const now = 1000;
    expect(shouldThrottleKey('playPause', now)).toBe(false);
    expect(shouldThrottleKey('playPause', now + 10)).toBe(false);
    expect(shouldThrottleKey('play', now)).toBe(false);
    expect(shouldThrottleKey('stop', now)).toBe(false);
    expect(shouldThrottleKey('fastForward', now)).toBe(false);
    expect(shouldThrottleKey('rewind', now)).toBe(false);
  });

  it('does not throttle first press of a navigation key', () => {
    expect(shouldThrottleKey('up', 1000)).toBe(false);
    expect(shouldThrottleKey('down', 1000)).toBe(false);
    expect(shouldThrottleKey('left', 1000)).toBe(false);
    expect(shouldThrottleKey('right', 1000)).toBe(false);
    expect(shouldThrottleKey('enter', 1000)).toBe(false);
    expect(shouldThrottleKey('back', 1000)).toBe(false);
  });

  it('throttles rapid repeat of the same navigation key', () => {
    expect(shouldThrottleKey('up', 1000)).toBe(false);
    expect(shouldThrottleKey('up', 1050)).toBe(true);
    expect(shouldThrottleKey('up', 1100)).toBe(true);
    expect(shouldThrottleKey('up', 1149)).toBe(true);
  });

  it('allows navigation key after throttle window expires', () => {
    expect(shouldThrottleKey('up', 1000)).toBe(false);
    expect(shouldThrottleKey('up', 1150)).toBe(false);
    expect(shouldThrottleKey('up', 1300)).toBe(false);
  });

  it('tracks different navigation keys independently', () => {
    expect(shouldThrottleKey('up', 1000)).toBe(false);
    expect(shouldThrottleKey('down', 1050)).toBe(false);
    expect(shouldThrottleKey('up', 1050)).toBe(true);
    expect(shouldThrottleKey('down', 1050)).toBe(true);
  });

  it('resets state correctly', () => {
    expect(shouldThrottleKey('up', 1000)).toBe(false);
    expect(shouldThrottleKey('up', 1050)).toBe(true);
    resetThrottleState();
    expect(shouldThrottleKey('up', 1050)).toBe(false);
  });
});
