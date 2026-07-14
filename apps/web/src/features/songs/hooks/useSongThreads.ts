import { useQuery } from '@tanstack/react-query';
import { getSongThread, getSongThreads } from '../api/songs.client';
import type { SongCommentTarget, SongThreadStatus } from '../../../shared/types';

export function useSongThreads(organizationId: string, songId: string, filters?: { versionId?: string | null; status?: SongThreadStatus; targetType?: SongCommentTarget; targetRef?: string }) {
  return useQuery({
    queryKey: ['songThreads', organizationId, songId, filters?.versionId ?? 'all', filters?.status ?? 'all', filters?.targetType ?? 'all', filters?.targetRef ?? 'all'],
    queryFn: () => getSongThreads(songId, filters),
    enabled: Boolean(organizationId && songId),
  });
}

export function useSongThread(organizationId: string, songId: string, threadId: string) {
  return useQuery({
    queryKey: ['songThread', organizationId, songId, threadId],
    queryFn: () => getSongThread(songId, threadId),
    enabled: Boolean(organizationId && songId && threadId),
  });
}
