import { useQuery } from '@tanstack/react-query';
import { getSongVersions } from '../api/songs.client';

export function useSongVersions(organizationId: string, songId: string) {
  return useQuery({
    queryKey: ['songVersions', organizationId, songId],
    queryFn: () => getSongVersions(songId),
    enabled: Boolean(organizationId && songId),
  });
}
