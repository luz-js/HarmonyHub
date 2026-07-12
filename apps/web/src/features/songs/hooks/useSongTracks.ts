import { useQuery } from '@tanstack/react-query';
import { getSongTracks } from '../api/songs.client';

export function useSongTracks(songId: string) {
  return useQuery({
    queryKey: ['songs', songId, 'tracks'],
    queryFn: () => getSongTracks(songId),
    enabled: Boolean(songId),
  });
}
