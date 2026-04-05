import { apiGet } from './client';
import type { SingleResponse, MediaLinks } from '../types';

export async function getMediaLinks(mid: number): Promise<MediaLinks> {
  const response = await apiGet<SingleResponse<MediaLinks>>('items/media-links', { mid });
  return response.item;
}
