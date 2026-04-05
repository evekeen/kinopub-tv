import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  parseSrt,
  sanitizeText,
  parseTimestamp,
  isUtf8Garbled,
  findCurrentCue,
  useSubtitles,
} from './useSubtitles';
import type { SubtitleCue } from './useSubtitles';

describe('parseTimestamp', () => {
  it('parses standard SRT timestamp with comma', () => {
    expect(parseTimestamp('00:02:17,440')).toBeCloseTo(137.44, 2);
  });

  it('parses timestamp with dot separator', () => {
    expect(parseTimestamp('01:30:00.000')).toBe(5400);
  });

  it('parses zero timestamp', () => {
    expect(parseTimestamp('00:00:00,000')).toBe(0);
  });

  it('parses hours correctly', () => {
    expect(parseTimestamp('02:00:00,000')).toBe(7200);
  });

  it('returns 0 for malformed timestamp', () => {
    expect(parseTimestamp('invalid')).toBe(0);
  });
});

describe('sanitizeText', () => {
  it('removes italic tags', () => {
    expect(sanitizeText('<i>Hello</i>')).toBe('Hello');
  });

  it('removes bold tags', () => {
    expect(sanitizeText('<b>Bold text</b>')).toBe('Bold text');
  });

  it('removes font tags with attributes', () => {
    expect(sanitizeText('<font color="#ff0000">Red</font>')).toBe('Red');
  });

  it('removes nested tags', () => {
    expect(sanitizeText('<i><b>Nested</b></i>')).toBe('Nested');
  });

  it('preserves plain text', () => {
    expect(sanitizeText('Hello World')).toBe('Hello World');
  });

  it('trims whitespace', () => {
    expect(sanitizeText('  Hello  ')).toBe('Hello');
  });

  it('handles self-closing tags', () => {
    expect(sanitizeText('Line<br/>break')).toBe('Linebreak');
  });
});

describe('parseSrt', () => {
  it('parses a simple SRT file', () => {
    const srt = [
      '1',
      '00:00:01,000 --> 00:00:04,000',
      'Hello world',
      '',
      '2',
      '00:00:05,000 --> 00:00:08,000',
      'Second subtitle',
    ].join('\n');

    const cues = parseSrt(srt, 0);
    expect(cues).toHaveLength(2);
    expect(cues[0].start).toBeCloseTo(1, 2);
    expect(cues[0].end).toBeCloseTo(4, 2);
    expect(cues[0].text).toBe('Hello world');
    expect(cues[1].start).toBeCloseTo(5, 2);
    expect(cues[1].text).toBe('Second subtitle');
  });

  it('handles multi-line subtitle text', () => {
    const srt = [
      '1',
      '00:00:01,000 --> 00:00:04,000',
      'Line one',
      'Line two',
    ].join('\n');

    const cues = parseSrt(srt, 0);
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe('Line one\nLine two');
  });

  it('strips HTML tags from subtitle text', () => {
    const srt = [
      '1',
      '00:00:01,000 --> 00:00:04,000',
      '<i>Italic text</i>',
    ].join('\n');

    const cues = parseSrt(srt, 0);
    expect(cues[0].text).toBe('Italic text');
  });

  it('handles Windows-style line endings (\\r\\n)', () => {
    const srt = '1\r\n00:00:01,000 --> 00:00:04,000\r\nHello\r\n\r\n2\r\n00:00:05,000 --> 00:00:08,000\r\nWorld';

    const cues = parseSrt(srt, 0);
    expect(cues).toHaveLength(2);
    expect(cues[0].text).toBe('Hello');
    expect(cues[1].text).toBe('World');
  });

  it('handles old Mac line endings (\\r)', () => {
    const srt = '1\r00:00:01,000 --> 00:00:04,000\rHello\r\r';

    const cues = parseSrt(srt, 0);
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe('Hello');
  });

  it('skips blocks without timestamp line', () => {
    const srt = [
      'garbage text',
      '',
      '1',
      '00:00:01,000 --> 00:00:04,000',
      'Valid cue',
    ].join('\n');

    const cues = parseSrt(srt, 0);
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe('Valid cue');
  });

  it('skips blocks with empty text after sanitization', () => {
    const srt = [
      '1',
      '00:00:01,000 --> 00:00:04,000',
      '<i></i>',
      '',
      '2',
      '00:00:05,000 --> 00:00:08,000',
      'Valid text',
    ].join('\n');

    const cues = parseSrt(srt, 0);
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe('Valid text');
  });

  it('returns empty array for empty input', () => {
    expect(parseSrt('', 0)).toEqual([]);
  });

  it('handles multiple blank lines between cues', () => {
    const srt = [
      '1',
      '00:00:01,000 --> 00:00:04,000',
      'First',
      '',
      '',
      '',
      '2',
      '00:00:05,000 --> 00:00:08,000',
      'Second',
    ].join('\n');

    const cues = parseSrt(srt, 0);
    expect(cues).toHaveLength(2);
  });

  it('applies shift offset to cue timestamps', () => {
    const srt = [
      '1',
      '00:00:10,000 --> 00:00:14,000',
      'Shifted cue',
    ].join('\n');

    const cues = parseSrt(srt, -2);
    expect(cues[0].start).toBeCloseTo(8, 2);
    expect(cues[0].end).toBeCloseTo(12, 2);
  });

  it('applies positive shift offset', () => {
    const srt = [
      '1',
      '00:00:01,000 --> 00:00:04,000',
      'Delayed',
    ].join('\n');

    const cues = parseSrt(srt, 1.5);
    expect(cues[0].start).toBeCloseTo(2.5, 2);
    expect(cues[0].end).toBeCloseTo(5.5, 2);
  });
});

describe('isUtf8Garbled', () => {
  it('returns false for clean UTF-8 text', () => {
    expect(isUtf8Garbled('Hello, this is normal text')).toBe(false);
  });

  it('returns false for Cyrillic UTF-8 text', () => {
    expect(isUtf8Garbled('Привет, мир!')).toBe(false);
  });

  it('returns true for text with high ratio of replacement characters', () => {
    const garbled = '\uFFFD'.repeat(10) + 'x'.repeat(90);
    expect(isUtf8Garbled(garbled)).toBe(true);
  });

  it('returns false for text with low ratio of replacement characters', () => {
    const text = '\uFFFD' + 'x'.repeat(500);
    expect(isUtf8Garbled(text)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isUtf8Garbled('')).toBe(false);
  });
});

describe('findCurrentCue', () => {
  const cues: SubtitleCue[] = [
    { start: 1, end: 4, text: 'First' },
    { start: 5, end: 8, text: 'Second' },
    { start: 10, end: 15, text: 'Third' },
  ];

  it('returns matching cue text at start boundary', () => {
    expect(findCurrentCue(cues, 1)).toBe('First');
  });

  it('returns matching cue text at end boundary', () => {
    expect(findCurrentCue(cues, 4)).toBe('First');
  });

  it('returns matching cue text in the middle', () => {
    expect(findCurrentCue(cues, 6.5)).toBe('Second');
  });

  it('returns null between cues', () => {
    expect(findCurrentCue(cues, 4.5)).toBeNull();
  });

  it('returns null before first cue', () => {
    expect(findCurrentCue(cues, 0)).toBeNull();
  });

  it('returns null after last cue', () => {
    expect(findCurrentCue(cues, 20)).toBeNull();
  });

  it('returns null for empty cue array', () => {
    expect(findCurrentCue([], 5)).toBeNull();
  });

  it('finds cue in large sorted array via binary search', () => {
    const largeCues: SubtitleCue[] = [];
    for (let i = 0; i < 1000; i++) {
      largeCues.push({
        start: i * 3,
        end: i * 3 + 2,
        text: 'Cue ' + i,
      });
    }
    expect(findCurrentCue(largeCues, 1501)).toBe('Cue 500');
    expect(findCurrentCue(largeCues, 2998)).toBe('Cue 999');
    expect(findCurrentCue(largeCues, 3000)).toBeNull();
  });
});

function makeSrtBuffer(content: string): ArrayBuffer {
  return new TextEncoder().encode(content).buffer;
}

describe('useSubtitles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts with null cue and no loading/error state', () => {
    const { result } = renderHook(() => useSubtitles(0));
    expect(result.current.currentCue).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('loads and parses SRT subtitle', async () => {
    const srt = '1\n00:00:01,000 --> 00:00:04,000\nHello subtitle';
    const buffer = makeSrtBuffer(srt);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(buffer),
    } as Response);

    const { result, rerender } = renderHook(
      ({ time }) => useSubtitles(time),
      { initialProps: { time: 0 } },
    );

    await act(async () => {
      result.current.loadSubtitle('https://example.com/sub.srt', 0);
    });

    rerender({ time: 2 });
    expect(result.current.currentCue).toBe('Hello subtitle');

    rerender({ time: 10 });
    expect(result.current.currentCue).toBeNull();
  });

  it('applies shift when loading subtitle', async () => {
    const srt = '1\n00:00:10,000 --> 00:00:14,000\nShifted';
    const buffer = makeSrtBuffer(srt);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(buffer),
    } as Response);

    const { result, rerender } = renderHook(
      ({ time }) => useSubtitles(time),
      { initialProps: { time: 0 } },
    );

    await act(async () => {
      result.current.loadSubtitle('https://example.com/sub.srt', -2000);
    });

    rerender({ time: 9 });
    expect(result.current.currentCue).toBe('Shifted');

    rerender({ time: 7 });
    expect(result.current.currentCue).toBeNull();
  });

  it('sets error on fetch failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    const { result } = renderHook(() => useSubtitles(0));

    await act(async () => {
      result.current.loadSubtitle('https://example.com/missing.srt', 0);
    });

    expect(result.current.error).toBe('Failed to fetch subtitle: 404');
    expect(result.current.loading).toBe(false);
  });

  it('clears subtitles on clearSubtitle', async () => {
    const srt = '1\n00:00:01,000 --> 00:00:04,000\nHello';
    const buffer = makeSrtBuffer(srt);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(buffer),
    } as Response);

    const { result, rerender } = renderHook(
      ({ time }) => useSubtitles(time),
      { initialProps: { time: 2 } },
    );

    await act(async () => {
      result.current.loadSubtitle('https://example.com/sub.srt', 0);
    });

    rerender({ time: 2 });
    expect(result.current.currentCue).toBe('Hello');

    act(() => {
      result.current.clearSubtitle();
    });

    rerender({ time: 2 });
    expect(result.current.currentCue).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets loading true while fetching', async () => {
    let resolveArrayBuffer: (value: ArrayBuffer) => void;
    const bufferPromise = new Promise<ArrayBuffer>((resolve) => {
      resolveArrayBuffer = resolve;
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => bufferPromise,
    } as Response);

    const { result } = renderHook(() => useSubtitles(0));

    act(() => {
      result.current.loadSubtitle('https://example.com/sub.srt', 0);
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveArrayBuffer!(makeSrtBuffer('1\n00:00:01,000 --> 00:00:04,000\nDone'));
    });

    expect(result.current.loading).toBe(false);
  });

  it('late-resolving first fetch does not overwrite second subtitle', async () => {
    const srt1 = '1\n00:00:01,000 --> 00:00:04,000\nFirst';
    const srt2 = '1\n00:00:01,000 --> 00:00:04,000\nSecond';

    let firstResolve: ((value: ArrayBuffer) => void) | null = null;
    const firstArrayBufferPromise = new Promise<ArrayBuffer>((resolve) => {
      firstResolve = resolve;
    });

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => firstArrayBufferPromise,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(makeSrtBuffer(srt2)),
      } as Response);

    const { result, rerender } = renderHook(
      ({ time }) => useSubtitles(time),
      { initialProps: { time: 2 } },
    );

    act(() => {
      result.current.loadSubtitle('https://example.com/sub1.srt', 0);
    });

    await act(async () => {
      result.current.loadSubtitle('https://example.com/sub2.srt', 0);
    });

    rerender({ time: 2 });
    expect(result.current.currentCue).toBe('Second');
    expect(result.current.loading).toBe(false);

    await act(async () => {
      firstResolve!(makeSrtBuffer(srt1));
    });

    rerender({ time: 2 });
    expect(result.current.currentCue).toBe('Second');
  });
});
