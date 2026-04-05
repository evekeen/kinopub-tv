import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from './player';
import type { Audio, Subtitle } from '../types';

const mockAudioTracks: Audio[] = [
  { id: 1, index: 0, codec: 'aac', channels: 2, lang: 'eng' },
  { id: 2, index: 1, codec: 'aac', channels: 6, lang: 'rus' },
];

const mockSubtitles: Subtitle[] = [
  { lang: 'eng', shift: 0, embed: false, forced: false, file: 'en.srt', url: 'https://example.com/en.srt' },
  { lang: 'rus', shift: 0, embed: false, forced: false, file: 'ru.srt', url: 'https://example.com/ru.srt' },
];

describe('player store', () => {
  beforeEach(() => {
    usePlayerStore.getState().reset();
  });

  it('starts with initial state', () => {
    const state = usePlayerStore.getState();
    expect(state.mediaUrl).toBeNull();
    expect(state.subtitles).toEqual([]);
    expect(state.audioTracks).toEqual([]);
    expect(state.selectedAudioTrack).toBeNull();
    expect(state.selectedSubtitle).toBeNull();
    expect(state.isPlaying).toBe(false);
    expect(state.currentTime).toBe(0);
    expect(state.duration).toBe(0);
  });

  it('setMedia sets url, tracks, and subtitles', () => {
    usePlayerStore.getState().setMedia(
      'https://cdn.example.com/stream.m3u8',
      mockAudioTracks,
      mockSubtitles,
    );

    const state = usePlayerStore.getState();
    expect(state.mediaUrl).toBe('https://cdn.example.com/stream.m3u8');
    expect(state.audioTracks).toEqual(mockAudioTracks);
    expect(state.subtitles).toEqual(mockSubtitles);
    expect(state.selectedAudioTrack).toBe(0);
    expect(state.selectedSubtitle).toBeNull();
    expect(state.isPlaying).toBe(false);
    expect(state.currentTime).toBe(0);
  });

  it('setMedia with empty audio tracks sets selectedAudioTrack to null', () => {
    usePlayerStore.getState().setMedia(
      'https://cdn.example.com/stream.m3u8',
      [],
      mockSubtitles,
    );

    expect(usePlayerStore.getState().selectedAudioTrack).toBeNull();
  });

  it('setPlaying updates playing state', () => {
    usePlayerStore.getState().setPlaying(true);
    expect(usePlayerStore.getState().isPlaying).toBe(true);

    usePlayerStore.getState().setPlaying(false);
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('setCurrentTime updates time', () => {
    usePlayerStore.getState().setCurrentTime(125.5);
    expect(usePlayerStore.getState().currentTime).toBe(125.5);
  });

  it('setDuration updates duration', () => {
    usePlayerStore.getState().setDuration(7200);
    expect(usePlayerStore.getState().duration).toBe(7200);
  });

  it('setSelectedAudioTrack updates track index', () => {
    usePlayerStore.getState().setSelectedAudioTrack(1);
    expect(usePlayerStore.getState().selectedAudioTrack).toBe(1);
  });

  it('setSelectedSubtitle updates subtitle index', () => {
    usePlayerStore.getState().setSelectedSubtitle(0);
    expect(usePlayerStore.getState().selectedSubtitle).toBe(0);
  });

  it('setSelectedSubtitle with null disables subtitles', () => {
    usePlayerStore.getState().setSelectedSubtitle(0);
    usePlayerStore.getState().setSelectedSubtitle(null);
    expect(usePlayerStore.getState().selectedSubtitle).toBeNull();
  });

  it('reset restores initial state', () => {
    usePlayerStore.getState().setMedia(
      'https://cdn.example.com/stream.m3u8',
      mockAudioTracks,
      mockSubtitles,
    );
    usePlayerStore.getState().setPlaying(true);
    usePlayerStore.getState().setCurrentTime(500);

    usePlayerStore.getState().reset();

    const state = usePlayerStore.getState();
    expect(state.mediaUrl).toBeNull();
    expect(state.isPlaying).toBe(false);
    expect(state.currentTime).toBe(0);
    expect(state.audioTracks).toEqual([]);
  });
});
