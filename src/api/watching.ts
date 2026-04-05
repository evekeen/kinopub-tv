import { apiGet, apiPost } from './client';
import type { ListResponse, StatusResponse, Item, WatchingSerialItem } from '../types';

export async function getWatchingSerials(): Promise<ListResponse<WatchingSerialItem>> {
  return apiGet<ListResponse<WatchingSerialItem>>('watching/serials');
}

export async function getWatchingMovies(): Promise<ListResponse<Item>> {
  return apiGet<ListResponse<Item>>('watching/movies');
}

export async function markTime(itemId: number, videoId: number, time: number): Promise<StatusResponse> {
  return apiPost<StatusResponse>('watching/marktime', {
    id: itemId,
    video: videoId,
    time,
  });
}

export async function toggleWatched(itemId: number, videoId: number): Promise<StatusResponse> {
  return apiPost<StatusResponse>('watching/toggle', {
    id: itemId,
    video: videoId,
  });
}

export async function toggleWatchlist(itemId: number): Promise<StatusResponse> {
  return apiPost<StatusResponse>('watching/togglewatchlist', {
    id: itemId,
  });
}
