import { useMutation } from '@tanstack/react-query';
import { queryClient } from '../../../shared/api/query-client';
import type { SongNoteVisibility } from '../../../shared/types';
import { archiveSongNote, createSongNote, deleteSongNote, pinSongNote, updateSongNote } from '../api/songs.client';

function invalidateNoteQueries(organizationId: string, songId: string) {
  queryClient.invalidateQueries({ queryKey: ['songNotes', organizationId, songId] });
}

export function useCreateSongNote(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: (input: { title?: string; content: string; visibility: SongNoteVisibility; versionId?: string | null; isPinned?: boolean }) => createSongNote(songId, input),
    onSuccess: () => invalidateNoteQueries(organizationId, songId),
  });
}

export function useUpdateSongNote(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: ({ noteId, input }: { noteId: string; input: Partial<{ title: string | null; content: string; visibility: SongNoteVisibility; versionId: string | null }> }) =>
      updateSongNote(songId, noteId, input),
    onSuccess: (_data, variables) => {
      invalidateNoteQueries(organizationId, songId);
      queryClient.invalidateQueries({ queryKey: ['songNote', organizationId, songId, variables.noteId] });
    },
  });
}

export function useDeleteSongNote(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: (noteId: string) => deleteSongNote(songId, noteId),
    onSuccess: () => invalidateNoteQueries(organizationId, songId),
  });
}

export function usePinSongNote(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: (noteId: string) => pinSongNote(songId, noteId),
    onSuccess: () => invalidateNoteQueries(organizationId, songId),
  });
}

export function useArchiveSongNote(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: (noteId: string) => archiveSongNote(songId, noteId),
    onSuccess: () => invalidateNoteQueries(organizationId, songId),
  });
}
