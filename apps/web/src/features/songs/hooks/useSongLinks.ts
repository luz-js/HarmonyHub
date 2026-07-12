import { useQuery } from '@tanstack/react-query';
import { getSongLinks } from '../api/songs.client';

export function useSongLinks(songId: string) {
  return useQuery({
    queryKey: ['songs', songId, 'links'],
    queryFn: () => getSongLinks(songId),
    enabled: Boolean(songId),
  });
}
