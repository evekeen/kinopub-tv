import { WatchingStatus } from './api';

export type ItemType =
  | 'movie'
  | 'serial'
  | 'tvshow'
  | 'concert'
  | 'documovie'
  | 'docuserial'
  | '3d';

export type ItemSubtype = 'multi' | null;

export interface Genre {
  id: number;
  title: string;
  type: string;
}

export interface Country {
  id: number;
  title: string;
}

export interface Posters {
  small: string;
  medium: string;
  big: string;
  wide?: string;
}

export interface Duration {
  average: number;
  total: number;
}

export interface Trailer {
  id: number;
  url: string;
  file?: string;
}

export interface Audio {
  id: number;
  index: number;
  codec: string;
  channels: number;
  lang: string;
  type?: AudioMeta;
  author?: AudioMeta;
}

export interface AudioMeta {
  id: number;
  title: string;
  short_title?: string;
}

export interface Subtitle {
  lang: string;
  shift: number;
  embed: boolean;
  forced: boolean;
  file: string;
  url: string;
}

export interface WatchingProgress {
  status: WatchingStatus;
  time: number;
}

export interface Video {
  id: number;
  title: string;
  number: number;
  snumber: number;
  thumbnail: string;
  duration: number;
  watched: WatchingStatus;
  watching: WatchingProgress;
  tracks: number;
  ac3: 0 | 1;
  audios: Audio[];
  subtitles: Subtitle[];
}

export interface Season {
  id: number;
  number: number;
  title: string;
  episodes: Video[];
  watched: WatchingStatus;
  watching: WatchingProgress;
}

export interface BookmarkRef {
  id: number;
  title: string;
}

export interface Item {
  id: number;
  title: string;
  type: ItemType;
  subtype: ItemSubtype;
  year: number;
  cast: string;
  director: string;
  voice: string;
  duration: Duration;
  langs: number;
  ac3: 0 | 1;
  quality: number;
  poor_quality: boolean;
  plot: string;
  imdb: number;
  imdb_rating: number;
  imdb_votes: number;
  kinopoisk: number;
  kinopoisk_rating: number;
  kinopoisk_votes: number;
  rating: number;
  rating_votes: number;
  rating_percentage: number;
  views: number;
  comments: number;
  finished: boolean;
  advert: boolean;
  in_watchlist: boolean;
  subscribed: boolean;
  created_at: number;
  updated_at: number;
  posters: Posters;
  trailer: Trailer;
  genres: Genre[];
  countries: Country[];
  bookmarks: BookmarkRef[];
}

export interface ItemDetails extends Item {
  videos?: Video[];
  seasons?: Season[];
}

export interface ContentTypeDefinition {
  id: ItemType;
  title: string;
}

export interface ItemsQueryParams {
  type?: ItemType;
  genre?: number;
  sort?: string;
  page?: number;
  perpage?: number;
}

export interface ContentListParams {
  type?: ItemType;
  page?: number;
}
