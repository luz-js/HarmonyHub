import type { SongSummary } from './song.types';

export type SetlistSummary = {
  id: string;
  name: string;
  date: string;
  songs: SongSummary[];
  duration: string;
};
