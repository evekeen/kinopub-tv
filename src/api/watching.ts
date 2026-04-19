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

export async function markTime(itemId: number, videoId: number, time: number): Promise<StatusResponse> {
  return apiPost<StatusResponse>('watching/marktime', {
    id: itemId,
    video: videoId,
    time,
  });
}

export async function toggleWatched(itemId: number, videoId: number, seasonNumber?: number): Promise<StatusResponse> {
  const body: Record<string, number> = {
    id: itemId,
    video: videoId,
  };
  if (seasonNumber !== undefined) {
    body.season = seasonNumber;
  }
  return apiPost<StatusResponse>('watching/toggle', body);
}

export async function toggleWatchlist(itemId: number): Promise<StatusResponse> {
  return apiPost<StatusResponse>('watching/togglewatchlist', {
    id: itemId,
  });
}
