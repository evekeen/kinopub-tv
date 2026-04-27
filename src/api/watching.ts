import { apiGet, apiPost } from './client';
import type { ListResponse, StatusResponse, WatchingSerialItem, WatchingMovieItem } from '../types';

export async function getWatchingSerials(sort?: string, subscribed?: boolean): Promise<ListResponse<WatchingSerialItem>> {
  return apiGet<ListResponse<WatchingSerialItem>>('watching/serials', {
    sort,
    subscribed: subscribed === true ? 1 : undefined,
  });
}

export async function getWatchingMovies(sort?: string): Promise<ListResponse<WatchingMovieItem>> {
  return apiGet<ListResponse<WatchingMovieItem>>('watching/movies', { sort });
}

export async function markTime(
  itemId: number,
  videoNumber: number,
  time: number,
  seasonNumber?: number,
): Promise<StatusResponse> {
  return apiPost<StatusResponse>('watching/marktime', {
    id: itemId,
    video: videoNumber,
    time,
    season: seasonNumber,
  });
}

export async function toggleWatched(
  itemId: number,
  videoNumber: number,
  seasonNumber?: number,
  status?: 0 | 1,
): Promise<StatusResponse> {
  return apiPost<StatusResponse>('watching/toggle', {
    id: itemId,
    video: videoNumber,
    season: seasonNumber,
    status,
  });
}

export async function toggleWatchlist(itemId: number): Promise<StatusResponse> {
  return apiPost<StatusResponse>('watching/togglewatchlist', {
    id: itemId,
  });
}
