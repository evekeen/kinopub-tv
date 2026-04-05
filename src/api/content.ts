import { apiGet } from './client';
import type {
  ListResponse,
  PaginatedResponse,
  SingleResponse,
  Genre,
  Item,
  ItemDetails,
  ItemType,
  ContentTypeDefinition,
  ItemsQueryParams,
  ContentListParams,
} from '../types';

export async function getTypes(): Promise<ListResponse<ContentTypeDefinition>> {
  return apiGet<ListResponse<ContentTypeDefinition>>('types');
}

export async function getGenres(type?: ItemType): Promise<ListResponse<Genre>> {
  return apiGet<ListResponse<Genre>>('genres', type !== undefined ? { type } : undefined);
}

export async function getItems(params: ItemsQueryParams): Promise<PaginatedResponse<Item>> {
  return apiGet<PaginatedResponse<Item>>('items', { ...params });
}

export async function searchItems(query: string, page?: number): Promise<PaginatedResponse<Item>> {
  return apiGet<PaginatedResponse<Item>>('items/search', { q: query, page });
}

export async function getItemDetail(id: number): Promise<SingleResponse<ItemDetails>> {
  return apiGet<SingleResponse<ItemDetails>>(`items/${id}`, { nolinks: 1 });
}

export async function getFresh(params?: ContentListParams): Promise<PaginatedResponse<Item>> {
  return apiGet<PaginatedResponse<Item>>('items/fresh', params ? { ...params } : undefined);
}

export async function getHot(params?: ContentListParams): Promise<PaginatedResponse<Item>> {
  return apiGet<PaginatedResponse<Item>>('items/hot', params ? { ...params } : undefined);
}

export async function getPopular(params?: ContentListParams): Promise<PaginatedResponse<Item>> {
  return apiGet<PaginatedResponse<Item>>('items/popular', params ? { ...params } : undefined);
}
