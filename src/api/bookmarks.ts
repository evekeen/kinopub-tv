import { apiGet, apiPost } from './client';
import type { ListResponse, PaginatedResponse, StatusResponse, Item, BookmarkFolder } from '../types';

export async function getFolders(): Promise<ListResponse<BookmarkFolder>> {
  return apiGet<ListResponse<BookmarkFolder>>('bookmarks');
}

export async function getFolderItems(folderId: number, page?: number): Promise<PaginatedResponse<Item>> {
  return apiGet<PaginatedResponse<Item>>(`bookmarks/${folderId}`, { page });
}

export async function addItem(itemId: number, folderId: number): Promise<StatusResponse> {
  return apiPost<StatusResponse>('bookmarks/add', { item: itemId, folder: folderId });
}

export async function removeItem(itemId: number, folderId: number): Promise<StatusResponse> {
  return apiPost<StatusResponse>('bookmarks/remove-item', { item: itemId, folder: folderId });
}
