import { describe, it, expect } from 'vitest';
import { formatTime } from './ProgressBar';

describe('formatTime', () => {
  it('formats zero seconds', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats seconds under a minute', () => {
    expect(formatTime(45)).toBe('0:45');
  });

  it('formats exactly one minute', () => {
    expect(formatTime(60)).toBe('1:00');
  });

  it('formats minutes and seconds', () => {
    expect(formatTime(125)).toBe('2:05');
  });

  it('formats exactly one hour', () => {
    expect(formatTime(3600)).toBe('1:00:00');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatTime(3661)).toBe('1:01:01');
  });

  it('formats with fractional seconds (floors)', () => {
    expect(formatTime(125.9)).toBe('2:05');
  });

  it('formats two hours plus', () => {
    expect(formatTime(7384)).toBe('2:03:04');
  });

  it('pads single-digit seconds', () => {
    expect(formatTime(62)).toBe('1:02');
  });

  it('pads single-digit minutes in hour format', () => {
    expect(formatTime(3720)).toBe('1:02:00');
  });
});
