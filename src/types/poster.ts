import type { Posters } from './content';

export interface PosterItem {
  id: number;
  title: string;
  posters: Posters;
  year?: number;
  kinopoisk_rating?: number;
  imdb_rating?: number;
}
