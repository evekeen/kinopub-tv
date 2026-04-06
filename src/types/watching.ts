import { Item, ItemSubtype, ItemType, Posters } from './content';

export interface WatchingSerialItem {
  id: number;
  type: ItemType;
  title: string;
  subtype: ItemSubtype;
  posters: Posters;
  new: number;
  total: number;
  watched: number;
}

export interface WatchingMovieItem {
  id: number;
  type: ItemType;
  title: string;
  subtype: ItemSubtype;
  posters: Posters;
  status: number;
  time: number;
  duration: number;
}

export interface HistoryEntry {
  counter: number;
  first_seen: number;
  last_seen: number;
  time: number;
  deleted?: boolean;
  item: Item;
  media?: HistoryMedia;
}

export interface HistoryMedia {
  id: number;
  number: number;
  snumber: number;
  thumbnail: string;
  title: string;
  tracks: number;
  duration: number;
}
