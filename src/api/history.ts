import { apiGet } from './client';
import type { PaginatedResponse, HistoryEntry } from '../types';

export async function getHistory(page?: number): Promise<PaginatedResponse<HistoryEntry>> {
  return apiGet<PaginatedResponse<HistoryEntry>>('history', { page });
}
