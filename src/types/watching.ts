import { Item } from './content';

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
