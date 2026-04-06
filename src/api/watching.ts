import { apiGet, apiPost } from './client';
import type { ListResponse, StatusResponse, WatchingSerialItem, WatchingMovieItem } from '../types';

export async function getWatchingSerials(sort?: string): Promise<ListResponse<WatchingSerialItem>> {
  return apiGet<ListResponse<WatchingSerialItem>>('watching/serials', { sort });
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
