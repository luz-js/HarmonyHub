import { useQuery } from '@tanstack/react-query';
import { getSongFiles } from '../api/songs.client';

export function useSongFiles(songId: string) {
  return useQuery({
    queryKey: ['songs', songId, 'files'],
    queryFn: () => getSongFiles(songId),
    enabled: Boolean(songId),
  });
}
