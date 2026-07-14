import { useQuery } from '@tanstack/react-query';
import { getSongNote, getSongNotes } from '../api/songs.client';
import type { SongNoteVisibility } from '../../../shared/types';

export function useSongNotes(organizationId: string, songId: string, filters?: { versionId?: string | null; visibility?: SongNoteVisibility; includeArchived?: boolean }) {
  return useQuery({
    queryKey: ['songNotes', organizationId, songId, filters?.versionId ?? 'all', filters?.visibility ?? 'all', filters?.includeArchived ?? false],
    queryFn: () => getSongNotes(songId, filters),
    enabled: Boolean(organizationId && songId),
  });
}

export function useSongNote(organizationId: string, songId: string, noteId: string) {
  return useQuery({
    queryKey: ['songNote', organizationId, songId, noteId],
    queryFn: () => getSongNote(songId, noteId),
    enabled: Boolean(organizationId && songId && noteId),
  });
}
