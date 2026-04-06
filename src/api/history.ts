import { apiGet } from './client';
import type { HistoryResponse } from '../types';

export async function getHistory(page?: number): Promise<HistoryResponse> {
  return apiGet<HistoryResponse>('history', { page });
}
