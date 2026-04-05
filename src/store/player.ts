import { create } from 'zustand';
import type { Audio, Subtitle } from '../types';

interface PlayerState {
  mediaUrl: string | null;
  subtitles: Subtitle[];
  audioTracks: Audio[];
  selectedAudioTrack: number | null;
  selectedSubtitle: number | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  setMedia: (mediaUrl: string, audioTracks: Audio[], subtitles: Subtitle[]) => void;
  setPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setSelectedAudioTrack: (trackIndex: number) => void;
  setSelectedSubtitle: (subtitleIndex: number | null) => void;
  reset: () => void;
}

type PlayerData = Pick<PlayerState,
  | 'mediaUrl'
  | 'subtitles'
  | 'audioTracks'
  | 'selectedAudioTrack'
  | 'selectedSubtitle'
  | 'isPlaying'
  | 'currentTime'
  | 'duration'
>;

const INITIAL_STATE: PlayerData = {
  mediaUrl: null,
  subtitles: [],
  audioTracks: [],
  selectedAudioTrack: null,
  selectedSubtitle: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
};

export const usePlayerStore = create<PlayerState>()((set) => ({
  ...INITIAL_STATE,

  setMedia(mediaUrl: string, audioTracks: Audio[], subtitles: Subtitle[]): void {
    set({
      mediaUrl,
      audioTracks,
      subtitles,
      selectedAudioTrack: audioTracks.length > 0 ? 0 : null,
      selectedSubtitle: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    });
  },

  setPlaying(isPlaying: boolean): void {
    set({ isPlaying });
  },

  setCurrentTime(time: number): void {
    set({ currentTime: time });
  },

  setDuration(duration: number): void {
    set({ duration });
  },

  setSelectedAudioTrack(trackIndex: number): void {
    set({ selectedAudioTrack: trackIndex });
  },

  setSelectedSubtitle(subtitleIndex: number | null): void {
    set({ selectedSubtitle: subtitleIndex });
  },

  reset(): void {
    set({ ...INITIAL_STATE });
  },
}));
