import { WatchingStatus } from './api';
import { Item, ItemType } from './content';

export type { WatchingStatus };

export interface WatchingEpisode {
  id: number;
  number: number;
  title: string;
  duration: number;
  status: WatchingStatus;
  time: number;
  updated: number | null;
}

export interface WatchingSeason {
  number: number;
  status: WatchingStatus;
  episodes: WatchingEpisode[];
}

export interface WatchingItem {
  id: number;
  title: string;
  type: ItemType;
  status: WatchingStatus;
  seasons?: WatchingSeason[];
  videos?: WatchingEpisode[];
}

export interface WatchingSerialItem extends Item {
  new: number;
  total: number;
  watched: number;
}

export interface HistoryEntry {
  counter: number;
  first_seen: number;
  last_seen: number;
  time: number;
  deleted: boolean;
  item: Item;
}
