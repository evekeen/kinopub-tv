export type WatchingStatus = -1 | 0 | 1;

export interface SingleResponse<T> {
  status: number;
  item: T;
}

export interface ListResponse<T> {
  status: number;
  items: T[];
}

export interface Pagination {
  total: number;
  current: number;
  perpage: number;
  total_items: number;
}

export interface PaginatedResponse<T> {
  status: number;
  items: T[];
  pagination: Pagination;
}

export interface StatusResponse {
  status: number;
}

import type { HistoryEntry } from './watching';

export interface HistoryResponse {
  history: HistoryEntry[];
}


