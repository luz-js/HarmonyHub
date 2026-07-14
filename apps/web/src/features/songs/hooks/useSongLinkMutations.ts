import { useMutation } from '@tanstack/react-query';
import { queryClient } from '../../../shared/api/query-client';
import { createSongLink, deleteSongLink, reorderSongLinks, setPrimarySongLink, updateSongLink } from '../api/songs.client';

function invalidateLinkQueries(organizationId: string, songId: string) {
  queryClient.invalidateQueries({ queryKey: ['song', organizationId, songId] });
  queryClient.invalidateQueries({ queryKey: ['songLinks', organizationId, songId] });
}

export function useCreateSongLink(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: (input: { url: string; title: string; isPrimary?: boolean; versionId?: string | null }) => createSongLink(songId, input),
    onSuccess: () => invalidateLinkQueries(organizationId, songId),
  });
}

export function useUpdateSongLink(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: ({ linkId, input }: {
      linkId: string;
      input: Partial<{ url: string; title: string; isPrimary: boolean; versionId: string | null; active: boolean; sortOrder: number }>;
    }) => updateSongLink(songId, linkId, input),
    onSuccess: (_data, variables) => {
      invalidateLinkQueries(organizationId, songId);
      queryClient.invalidateQueries({ queryKey: ['songLink', organizationId, songId, variables.linkId] });
    },
  });
}

export function useDeleteSongLink(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: (linkId: string) => deleteSongLink(songId, linkId),
    onSuccess: () => invalidateLinkQueries(organizationId, songId),
  });
}

export function useSetPrimarySongLink(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: (linkId: string) => setPrimarySongLink(songId, linkId),
    onSuccess: (_data, linkId) => {
      invalidateLinkQueries(organizationId, songId);
      queryClient.invalidateQueries({ queryKey: ['songLink', organizationId, songId, linkId] });
    },
  });
}

export function useReorderSongLinks(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: (input: { versionId?: string | null; items: Array<{ id: string; sortOrder: number }> }) => reorderSongLinks(songId, input),
    onSuccess: () => invalidateLinkQueries(organizationId, songId),
  });
}
