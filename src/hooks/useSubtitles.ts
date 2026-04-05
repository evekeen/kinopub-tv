import { useState, useEffect, useCallback, useRef } from 'react';

interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

interface UseSubtitlesResult {
  currentCue: string | null;
  loading: boolean;
  error: string | null;
  loadSubtitle: (url: string, shiftMs: number) => void;
  clearSubtitle: () => void;
}

const HTML_TAG_RE = /<\/?[^>]+>/g;
const GARBLED_SAMPLE_LENGTH = 500;
const GARBLED_RATIO_THRESHOLD = 0.01;

function sanitizeText(raw: string): string {
  return raw.replace(HTML_TAG_RE, '').trim();
}

function parseTimestamp(ts: string): number {
  const parts = ts.trim().split(':');
  if (parts.length !== 3) return 0;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const secAndMs = parts[2].split(/[,.]/, 2);
  const seconds = parseInt(secAndMs[0], 10);
  const millis = parseInt(secAndMs[1] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds + millis / 1000;
}

function parseSrt(content: string, shiftSec: number): SubtitleCue[] {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\n+/);
  const cues: SubtitleCue[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const lines = blocks[i].trim().split('\n');
    if (lines.length < 2) continue;

    let timeLineIndex = -1;
    for (let j = 0; j < lines.length; j++) {
      if (lines[j].includes('-->')) {
        timeLineIndex = j;
        break;
      }
    }

    if (timeLineIndex === -1) continue;

    const timeParts = lines[timeLineIndex].split('-->');
    if (timeParts.length !== 2) continue;

    const start = parseTimestamp(timeParts[0]) + shiftSec;
    const end = parseTimestamp(timeParts[1]) + shiftSec;

    const textLines: string[] = [];
    for (let j = timeLineIndex + 1; j < lines.length; j++) {
      const sanitized = sanitizeText(lines[j]);
      if (sanitized.length > 0) {
        textLines.push(sanitized);
      }
    }

    if (textLines.length > 0) {
      cues.push({ start, end, text: textLines.join('\n') });
    }
  }

  return cues;
}

function isUtf8Garbled(text: string): boolean {
  const sampleLength = Math.min(text.length, GARBLED_SAMPLE_LENGTH);
  if (sampleLength === 0) return false;

  let replacementCount = 0;
  for (let i = 0; i < sampleLength; i++) {
    if (text.charCodeAt(i) === 0xFFFD) {
      replacementCount++;
    }
  }
  return replacementCount / sampleLength > GARBLED_RATIO_THRESHOLD;
}

function decodeBuffer(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  if (!isUtf8Garbled(utf8)) {
    return utf8;
  }
  return new TextDecoder('windows-1251').decode(buffer);
}

function findCurrentCue(cues: SubtitleCue[], time: number): string | null {
  let lo = 0;
  let hi = cues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const cue = cues[mid];
    if (time < cue.start) {
      hi = mid - 1;
    } else if (time > cue.end) {
      lo = mid + 1;
    } else {
      return cue.text;
    }
  }
  return null;
}

export function useSubtitles(currentTime: number): UseSubtitlesResult {
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef<number>(0);

  const loadSubtitle = useCallback((url: string, shiftMs: number): void => {
    const requestId = ++cancelledRef.current;
    const shiftSec = shiftMs / 1000;

    setLoading(true);
    setError(null);
    setCues([]);

    fetch(url)
      .then((response) => {
        if (cancelledRef.current !== requestId) return null;
        if (!response.ok) {
          throw new Error('Failed to fetch subtitle: ' + response.status);
        }
        return response.arrayBuffer();
      })
      .then((buffer) => {
        if (buffer === null || cancelledRef.current !== requestId) return;
        const text = decodeBuffer(buffer);
        const parsed = parseSrt(text, shiftSec);
        setCues(parsed);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelledRef.current !== requestId) return;
        const message = err instanceof Error ? err.message : 'Unknown subtitle error';
        setError(message);
        setLoading(false);
      });
  }, []);

  const clearSubtitle = useCallback((): void => {
    cancelledRef.current++;
    setCues([]);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      cancelledRef.current++;
    };
  }, []);

  const currentCue = cues.length > 0 ? findCurrentCue(cues, currentTime) : null;

  return { currentCue, loading, error, loadSubtitle, clearSubtitle };
}

export { parseSrt, sanitizeText, parseTimestamp, decodeBuffer, isUtf8Garbled, findCurrentCue };
export type { SubtitleCue, UseSubtitlesResult };
