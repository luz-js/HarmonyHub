import { useMutation } from '@tanstack/react-query';
import { queryClient } from '../../../shared/api/query-client';
import { restoreSongRevision } from '../api/songs.client';

export function useRestoreSongRevision(organizationId: string, songId: string, versionId: string) {
  return useMutation({
    mutationFn: ({ revisionNumber, reason }: { revisionNumber: number; reason?: string }) => restoreSongRevision(songId, versionId, revisionNumber, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['song', organizationId, songId] });
      queryClient.invalidateQueries({ queryKey: ['songVersion', organizationId, songId, versionId] });
      queryClient.invalidateQueries({ queryKey: ['songVersions', organizationId, songId] });
      queryClient.invalidateQueries({ queryKey: ['songRevisions', organizationId, songId, versionId] });
      queryClient.invalidateQueries({ queryKey: ['songActivity', organizationId, songId] });
    },
  });
}
