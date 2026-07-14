import { useMutation } from '@tanstack/react-query';
import { queryClient } from '../../../shared/api/query-client';
import type { SongTrack, SongTrackType, TrackProvider } from '../../../shared/types';
import { copySongTrackReferences, createSongTrack, deleteSongTrack, reorderSongTracks, setPrimarySongTrack, updateSongTrack, uploadSongTrack } from '../api/songs.client';

function invalidateTrackQueries(organizationId: string, songId: string) {
  queryClient.invalidateQueries({ queryKey: ['song', organizationId, songId] });
  queryClient.invalidateQueries({ queryKey: ['songTracks', organizationId, songId] });
}

export function useCreateSongTrack(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: (input: {
      name: string;
      type: SongTrackType;
      instrument?: string;
      url?: string;
      durationSec?: number;
      isPrimary?: boolean;
      versionId?: string | null;
      provider?: TrackProvider;
    }) => createSongTrack(songId, input),
    onSuccess: () => invalidateTrackQueries(organizationId, songId),
  });
}

export function useUploadSongTrack(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: ({ input, onProgress }: {
      input: {
        file: File;
        name?: string;
        type: SongTrackType;
        instrument?: string;
        versionId?: string | null;
        isPrimary?: boolean;
        durationSec?: number;
      };
      onProgress?: (progress: number) => void;
    }) => uploadSongTrack(songId, input, onProgress),
    onSuccess: () => invalidateTrackQueries(organizationId, songId),
  });
}

export function useUpdateSongTrack(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: ({ trackId, input }: { trackId: string; input: Partial<SongTrack> }) => updateSongTrack(songId, trackId, input),
    onSuccess: (_data, variables) => {
      invalidateTrackQueries(organizationId, songId);
      queryClient.invalidateQueries({ queryKey: ['songTrack', organizationId, songId, variables.trackId] });
    },
  });
}

export function useDeleteSongTrack(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: (trackId: string) => deleteSongTrack(songId, trackId),
    onSuccess: () => invalidateTrackQueries(organizationId, songId),
  });
}

export function useSetPrimarySongTrack(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: (trackId: string) => setPrimarySongTrack(songId, trackId),
    onSuccess: (_data, trackId) => {
      invalidateTrackQueries(organizationId, songId);
      queryClient.invalidateQueries({ queryKey: ['songTrack', organizationId, songId, trackId] });
    },
  });
}

export function useReorderSongTracks(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: (input: { versionId?: string | null; items: Array<{ id: string; sortOrder: number }> }) => reorderSongTracks(songId, input),
    onSuccess: () => invalidateTrackQueries(organizationId, songId),
  });
}

export function useCopySongTrackReferences(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: (input: { sourceVersionId: string; targetVersionId: string }) => copySongTrackReferences(songId, input),
    onSuccess: () => invalidateTrackQueries(organizationId, songId),
  });
}
