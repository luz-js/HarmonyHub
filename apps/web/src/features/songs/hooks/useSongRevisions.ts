import { useQuery } from '@tanstack/react-query';
import { diffSongRevision, getSongRevision, getSongRevisions } from '../api/songs.client';

export function useSongRevisions(organizationId: string, songId: string, versionId: string) {
  return useQuery({
    queryKey: ['songRevisions', organizationId, songId, versionId],
    queryFn: () => getSongRevisions(songId, versionId),
    enabled: Boolean(organizationId && songId && versionId),
  });
}

export function useSongRevision(organizationId: string, songId: string, versionId: string, revisionNumber: number | null) {
  return useQuery({
    queryKey: ['songRevision', organizationId, songId, versionId, revisionNumber],
    queryFn: () => getSongRevision(songId, versionId, revisionNumber as number),
    enabled: Boolean(organizationId && songId && versionId && revisionNumber),
  });
}

export function useSongRevisionDiff(organizationId: string, songId: string, versionId: string, revisionNumber: number | null, compareTo?: number) {
  return useQuery({
    queryKey: ['songRevisionDiff', organizationId, songId, versionId, revisionNumber, compareTo ?? 'current'],
    queryFn: () => diffSongRevision(songId, versionId, revisionNumber as number, compareTo),
    enabled: Boolean(organizationId && songId && versionId && revisionNumber),
  });
}
