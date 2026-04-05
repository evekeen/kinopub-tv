import { apiGet } from './client';
import type { MediaLinks } from '../types';

export async function getMediaLinks(mid: number): Promise<MediaLinks> {
  return apiGet<MediaLinks>('items/media-links', { mid });
}
