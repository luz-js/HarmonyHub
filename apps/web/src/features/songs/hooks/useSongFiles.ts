import { useQuery } from '@tanstack/react-query';
import { getSongFile, getSongFiles } from '../api/songs.client';
import type { SongFileCategory } from '../../../shared/types';

export function useSongFiles(organizationId: string, songId: string, filters?: { versionId?: string | null; category?: SongFileCategory }) {
  return useQuery({
    queryKey: ['songFiles', organizationId, songId, filters?.versionId ?? 'all', filters?.category ?? 'all'],
    queryFn: () => getSongFiles(songId, filters),
    enabled: Boolean(organizationId && songId),
  });
}

export function useSongFile(organizationId: string, songId: string, songFileId: string) {
  return useQuery({
    queryKey: ['songFile', organizationId, songId, songFileId],
    queryFn: () => getSongFile(songId, songFileId),
    enabled: Boolean(organizationId && songId && songFileId),
  });
}
