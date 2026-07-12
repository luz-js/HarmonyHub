import { useMutation } from '@tanstack/react-query';
import type { SongVersion } from '../../../shared/types';
import { queryClient } from '../../../shared/api/query-client';
import { createSongVersion, deleteSongVersion, setDefaultSongVersion, updateSongVersion } from '../api/songs.client';
import type { SongContent } from '../types/song-content.types';
import { contentToPlainChords, contentToPlainLyrics, deriveStructureJson } from '../utils/song-content.utils';

function invalidateSongVersionQueries(organizationId: string, songId: string) {
  queryClient.invalidateQueries({ queryKey: ['song', organizationId, songId] });
  queryClient.invalidateQueries({ queryKey: ['songVersions', organizationId, songId] });
  queryClient.invalidateQueries({ queryKey: ['songs', organizationId] });
}

export function useCreateSongVersion(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: (input: Partial<SongVersion>) => createSongVersion(songId, input),
    onSuccess: () => invalidateSongVersionQueries(organizationId, songId),
  });
}

export function useUpdateSongVersion(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: ({ versionId, input }: { versionId: string; input: Partial<SongVersion> }) => updateSongVersion(songId, versionId, input),
    onSuccess: (_data, variables) => {
      invalidateSongVersionQueries(organizationId, songId);
      queryClient.invalidateQueries({ queryKey: ['songVersion', organizationId, songId, variables.versionId] });
    },
  });
}

export function useDeleteSongVersion(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: (versionId: string) => deleteSongVersion(songId, versionId),
    onSuccess: () => invalidateSongVersionQueries(organizationId, songId),
  });
}

export function useSetDefaultSongVersion(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: (versionId: string) => setDefaultSongVersion(songId, versionId),
    onSuccess: (_data, versionId) => {
      invalidateSongVersionQueries(organizationId, songId);
      queryClient.invalidateQueries({ queryKey: ['songVersion', organizationId, songId, versionId] });
    },
  });
}

export function useTransposeSongVersion(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: ({ versionId, key, content }: { versionId: string; key: string; content: SongContent }) => updateSongVersion(songId, versionId, {
      key,
      contentJson: content,
      structureJson: deriveStructureJson(content) as unknown as Record<string, unknown>,
      lyrics: contentToPlainLyrics(content),
      chords: contentToPlainChords(content),
    }),
    onSuccess: (_data, variables) => {
      invalidateSongVersionQueries(organizationId, songId);
      queryClient.invalidateQueries({ queryKey: ['songVersion', organizationId, songId, variables.versionId] });
    },
  });
}

export function useCreateTransposedSongVersion(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: ({ source, name, key, content }: { source: SongVersion; name: string; key: string; content: SongContent }) => createSongVersion(songId, {
      name,
      key,
      bpm: source.bpm,
      durationSec: source.durationSec,
      contentJson: content,
      structureJson: deriveStructureJson(content) as unknown as Record<string, unknown>,
      lyrics: contentToPlainLyrics(content),
      chords: contentToPlainChords(content),
      notes: source.notes,
      isDefault: false,
    }),
    onSuccess: () => invalidateSongVersionQueries(organizationId, songId),
  });
}
