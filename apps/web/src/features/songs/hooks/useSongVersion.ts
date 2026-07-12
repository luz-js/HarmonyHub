import { useQuery } from '@tanstack/react-query';
import { getSongVersion } from '../api/songs.client';

export function useSongVersion(organizationId: string, songId: string, versionId: string) {
  return useQuery({
    queryKey: ['songVersion', organizationId, songId, versionId],
    queryFn: () => getSongVersion(songId, versionId),
    enabled: Boolean(organizationId && songId && versionId),
  });
}
