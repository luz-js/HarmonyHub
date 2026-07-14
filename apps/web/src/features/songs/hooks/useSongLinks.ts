import { useQuery } from '@tanstack/react-query';
import { getSongLink, getSongLinks } from '../api/songs.client';

export function useSongLinks(organizationId: string, songId: string, filters?: { versionId?: string | null }) {
  return useQuery({
    queryKey: ['songLinks', organizationId, songId, filters?.versionId ?? 'all'],
    queryFn: () => getSongLinks(songId, filters),
    enabled: Boolean(organizationId && songId),
  });
}

export function useSongLink(organizationId: string, songId: string, linkId: string) {
  return useQuery({
    queryKey: ['songLink', organizationId, songId, linkId],
    queryFn: () => getSongLink(songId, linkId),
    enabled: Boolean(organizationId && songId && linkId),
  });
}
