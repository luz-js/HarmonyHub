import { useMutation } from '@tanstack/react-query';
import { queryClient } from '../../../shared/api/query-client';
import type { SongCommentTarget } from '../../../shared/types';
import {
  createSongComment,
  createSongThread,
  deleteSongComment,
  reopenSongThread,
  resolveSongThread,
  updateSongComment,
  updateSongThread,
} from '../api/songs.client';

function invalidateThreadQueries(organizationId: string, songId: string, threadId?: string) {
  queryClient.invalidateQueries({ queryKey: ['songThreads', organizationId, songId] });
  if (threadId) queryClient.invalidateQueries({ queryKey: ['songThread', organizationId, songId, threadId] });
}

export function useCreateSongThread(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: (input: {
      versionId?: string | null;
      targetType: SongCommentTarget;
      targetRef?: string | null;
      title?: string;
      content: string;
      mentionedUserIds?: string[];
    }) => createSongThread(songId, input),
    onSuccess: () => invalidateThreadQueries(organizationId, songId),
  });
}

export function useUpdateSongThread(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: ({ threadId, input }: { threadId: string; input: { title?: string | null } }) => updateSongThread(songId, threadId, input),
    onSuccess: (_data, variables) => invalidateThreadQueries(organizationId, songId, variables.threadId),
  });
}

export function useResolveSongThread(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: (threadId: string) => resolveSongThread(songId, threadId),
    onSuccess: (_data, threadId) => invalidateThreadQueries(organizationId, songId, threadId),
  });
}

export function useReopenSongThread(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: (threadId: string) => reopenSongThread(songId, threadId),
    onSuccess: (_data, threadId) => invalidateThreadQueries(organizationId, songId, threadId),
  });
}

export function useCreateSongComment(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: ({ threadId, input }: { threadId: string; input: { content: string; mentionedUserIds?: string[] } }) => createSongComment(songId, threadId, input),
    onSuccess: (_data, variables) => invalidateThreadQueries(organizationId, songId, variables.threadId),
  });
}

export function useUpdateSongComment(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: ({ threadId, commentId, input }: { threadId: string; commentId: string; input: { content: string } }) => updateSongComment(songId, threadId, commentId, input),
    onSuccess: (_data, variables) => invalidateThreadQueries(organizationId, songId, variables.threadId),
  });
}

export function useDeleteSongComment(organizationId: string, songId: string) {
  return useMutation({
    mutationFn: ({ threadId, commentId }: { threadId: string; commentId: string }) => deleteSongComment(songId, threadId, commentId),
    onSuccess: (_data, variables) => invalidateThreadQueries(organizationId, songId, variables.threadId),
  });
}
