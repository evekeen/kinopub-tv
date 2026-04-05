import { describe, it, expect } from 'vitest';
import { formatDuration } from './formatDuration';

describe('formatDuration', () => {
  it('formats seconds under 60 minutes as minutes', () => {
    expect(formatDuration(300)).toBe('5 min');
    expect(formatDuration(2700)).toBe('45 min');
  });

  it('formats exact hours without minutes', () => {
    expect(formatDuration(3600)).toBe('1h');
    expect(formatDuration(7200)).toBe('2h');
  });

  it('formats hours with remaining minutes', () => {
    expect(formatDuration(5400)).toBe('1h 30m');
    expect(formatDuration(8100)).toBe('2h 15m');
  });

  it('formats zero seconds as zero minutes', () => {
    expect(formatDuration(0)).toBe('0 min');
  });
});
