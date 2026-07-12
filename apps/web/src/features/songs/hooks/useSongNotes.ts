import { useQuery } from '@tanstack/react-query';
import { getSongNotes } from '../api/songs.client';

export function useSongNotes(songId: string) {
  return useQuery({
    queryKey: ['songs', songId, 'notes'],
    queryFn: () => getSongNotes(songId),
    enabled: Boolean(songId),
  });
}
