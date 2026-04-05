import { Subtitle } from './content';

export interface MediaUrl {
  http: string;
  hls: string;
  hls2?: string;
  hls4?: string;
}

export interface MediaFile {
  codec: string;
  w: number;
  h: number;
  quality: string;
  quality_id: number;
  file: string;
  url: MediaUrl;
}

export interface MediaLinks {
  id: number;
  thumbnail: string;
  files: MediaFile[];
  subtitles: Subtitle[];
}
