import { useMutation } from '@tanstack/react-query';
import { queryClient } from '../../../shared/api/query-client';
import type { SongFileCategory } from '../../../shared/types';
import { deleteSongFile, reorderSongFiles, setPrimarySongFile, updateSongFile, uploadSongFile } from '../api/songs.client';

function invalidateSongFileQueries(organizationId: string, songId: string) {
  queryClient.invalidateQueries({ queryKey: ['song', organizationId, songId] });
  queryClient.invalidateQueries({ queryKey: ['songFiles', organizationId, songId] });
}

export function useUploadSongFile(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: ({ input, onProgress }: {
      input: {
        file: File;
        title?: string;
        description?: string;
        category: SongFileCategory;
        versionId?: string | null;
        isPrimary?: boolean;
      };
      onProgress?: (progress: number) => void;
    }) => uploadSongFile(songId, input, onProgress),
    onSuccess: () => invalidateSongFileQueries(organizationId, songId),
  });
}

export function useUpdateSongFile(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: ({ songFileId, input }: {
      songFileId: string;
      input: Partial<{
        title: string;
        description: string | null;
        category: SongFileCategory;
        versionId: string | null;
        isPrimary: boolean;
        active: boolean;
        sortOrder: number;
      }>;
    }) => updateSongFile(songId, songFileId, input),
    onSuccess: (_data, variables) => {
      invalidateSongFileQueries(organizationId, songId);
      queryClient.invalidateQueries({ queryKey: ['songFile', organizationId, songId, variables.songFileId] });
    },
  });
}

export function useDeleteSongFile(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: (songFileId: string) => deleteSongFile(songId, songFileId),
    onSuccess: () => invalidateSongFileQueries(organizationId, songId),
  });
}

export function useSetPrimarySongFile(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: (songFileId: string) => setPrimarySongFile(songId, songFileId),
    onSuccess: (_data, songFileId) => {
      invalidateSongFileQueries(organizationId, songId);
      queryClient.invalidateQueries({ queryKey: ['songFile', organizationId, songId, songFileId] });
    },
  });
}

export function useReorderSongFiles(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: (input: { versionId?: string | null; items: Array<{ id: string; sortOrder: number }> }) => reorderSongFiles(songId, input),
    onSuccess: () => invalidateSongFileQueries(organizationId, songId),
  });
}
