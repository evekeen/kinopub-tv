import { apiGet } from './client';
import type { HistoryEntry } from '../types';

interface HistoryResponse {
  history: HistoryEntry[];
}

export async function getHistory(page?: number): Promise<HistoryResponse> {
  return apiGet<HistoryResponse>('history', { page });
}
