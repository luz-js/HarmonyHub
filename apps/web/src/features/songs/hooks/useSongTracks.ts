import { useQuery } from '@tanstack/react-query';
import { getSongTracks } from '../api/songs.client';

export function useSongTracks(organizationId: string, songId: string, filters?: { versionId?: string | null; includeGeneral?: boolean }) {
  return useQuery({
    queryKey: ['songTracks', organizationId, songId, filters?.versionId ?? 'all', filters?.includeGeneral ?? true],
    queryFn: () => getSongTracks(songId, filters),
    enabled: Boolean(organizationId && songId),
  });
}
