import { useMutation } from '@tanstack/react-query';
import { queryClient } from '../../../../shared/api/query-client';
import type {
  CopySetlistCuesInput,
  CreateSetlistCueInput,
  ReorderSetlistCuesInput,
  SetlistCue,
  UpdateSetlistCueInput,
  UpdateSetlistCueStatusInput,
} from '../../../../shared/types';
import {
  copySetlistCues,
  createSetlistCue,
  deleteSetlistCue,
  duplicateSetlistCue,
  reorderSetlistCues,
  updateSetlistCue,
  updateSetlistCueStatus,
} from '../api/setlist-cues.client';

function itemCuesKey(organizationId: string, setlistId: string, itemId: string) {
  return ['setlistItemCues', organizationId, setlistId, itemId] as const;
}

function invalidateAfterCueChange(organizationId: string, setlistId: string, setlistItemId: string | null) {
  queryClient.invalidateQueries({ queryKey: ['setlistProduction', organizationId, setlistId] });
  queryClient.invalidateQueries({ queryKey: ['setlistCues', organizationId, setlistId] });
  if (setlistItemId) queryClient.invalidateQueries({ queryKey: itemCuesKey(organizationId, setlistId, setlistItemId) });
}

export function useCreateSetlistCue(organizationId: string, setlistId: string) {
  return useMutation({
    mutationFn: (input: CreateSetlistCueInput) => createSetlistCue(setlistId, input),
    onSuccess: (created) => {
      if (created.setlistItemId) {
        const key = itemCuesKey(organizationId, setlistId, created.setlistItemId);
        queryClient.setQueryData<SetlistCue[] | undefined>(key, (old) => (old ? [...old, created] : [created]));
      }
      invalidateAfterCueChange(organizationId, setlistId, created.setlistItemId);
    },
  });
}

export function useUpdateSetlistCue(organizationId: string, setlistId: string) {
  return useMutation({
    mutationFn: ({ cueId, input }: { cueId: string; itemId: string | null; input: UpdateSetlistCueInput }) => updateSetlistCue(setlistId, cueId, input),
    onMutate: async ({ cueId, itemId, input }) => {
      if (!itemId) return {};
      const key = itemCuesKey(organizationId, setlistId, itemId);
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<SetlistCue[]>(key);
      queryClient.setQueryData<SetlistCue[] | undefined>(key, (old) =>
        old?.map((cue) => (cue.id === cueId ? ({ ...cue, ...input } as SetlistCue) : cue)),
      );
      return { prev, key };
    },
    onError: (_err, _vars, context) => {
      if (context?.key && context.prev) queryClient.setQueryData(context.key, context.prev);
    },
    onSuccess: (updated) => {
      if (updated.setlistItemId) {
        const key = itemCuesKey(organizationId, setlistId, updated.setlistItemId);
        queryClient.setQueryData<SetlistCue[] | undefined>(key, (old) => (old ? old.map((cue) => (cue.id === updated.id ? updated : cue)) : old));
      }
      invalidateAfterCueChange(organizationId, setlistId, updated.setlistItemId);
    },
  });
}

export function useUpdateSetlistCueStatus(organizationId: string, setlistId: string) {
  return useMutation({
    mutationFn: ({ cueId, input }: { cueId: string; itemId: string | null; input: UpdateSetlistCueStatusInput }) =>
      updateSetlistCueStatus(setlistId, cueId, input),
    onMutate: async ({ cueId, itemId, input }) => {
      if (!itemId) return {};
      const key = itemCuesKey(organizationId, setlistId, itemId);
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<SetlistCue[]>(key);
      queryClient.setQueryData<SetlistCue[] | undefined>(key, (old) =>
        old?.map((cue) => (cue.id === cueId ? { ...cue, status: input.status } : cue)),
      );
      return { prev, key };
    },
    onError: (_err, _vars, context) => {
      if (context?.key && context.prev) queryClient.setQueryData(context.key, context.prev);
    },
    onSuccess: (updated) => {
      if (updated.setlistItemId) {
        const key = itemCuesKey(organizationId, setlistId, updated.setlistItemId);
        queryClient.setQueryData<SetlistCue[] | undefined>(key, (old) => (old ? old.map((cue) => (cue.id === updated.id ? updated : cue)) : old));
      }
      invalidateAfterCueChange(organizationId, setlistId, updated.setlistItemId);
    },
  });
}

export function useDeleteSetlistCue(organizationId: string, setlistId: string) {
  return useMutation({
    mutationFn: ({ cueId }: { cueId: string; itemId: string | null }) => deleteSetlistCue(setlistId, cueId),
    onMutate: async ({ cueId, itemId }) => {
      if (!itemId) return {};
      const key = itemCuesKey(organizationId, setlistId, itemId);
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<SetlistCue[]>(key);
      queryClient.setQueryData<SetlistCue[] | undefined>(key, (old) => old?.filter((cue) => cue.id !== cueId));
      return { prev, key };
    },
    onError: (_err, _vars, context) => {
      if (context?.key && context.prev) queryClient.setQueryData(context.key, context.prev);
    },
    onSuccess: (_result, { itemId }) => invalidateAfterCueChange(organizationId, setlistId, itemId),
  });
}

export function useReorderSetlistCues(organizationId: string, setlistId: string) {
  return useMutation({
    mutationFn: (input: ReorderSetlistCuesInput) => reorderSetlistCues(setlistId, input),
    onMutate: async (input) => {
      if (!input.setlistItemId) return {};
      const key = itemCuesKey(organizationId, setlistId, input.setlistItemId);
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<SetlistCue[]>(key);
      queryClient.setQueryData<SetlistCue[] | undefined>(key, (old) => {
        if (!old) return old;
        const byId = new Map(old.map((cue) => [cue.id, cue]));
        const reorderedInPhase = input.cueIds
          .map((id, index) => {
            const cue = byId.get(id);
            return cue ? { ...cue, sortOrder: index } : null;
          })
          .filter((cue): cue is SetlistCue => cue !== null);
        const others = old.filter((cue) => cue.phase !== input.phase);
        return [...others, ...reorderedInPhase];
      });
      return { prev, key };
    },
    onError: (_err, _input, context) => {
      if (context?.key && context.prev) queryClient.setQueryData(context.key, context.prev);
    },
    onSuccess: (_reordered, input) => invalidateAfterCueChange(organizationId, setlistId, input.setlistItemId),
  });
}

export function useDuplicateSetlistCue(organizationId: string, setlistId: string) {
  return useMutation({
    mutationFn: ({ cueId }: { cueId: string; itemId: string | null }) => duplicateSetlistCue(setlistId, cueId),
    onSuccess: (created) => {
      if (created.setlistItemId) {
        const key = itemCuesKey(organizationId, setlistId, created.setlistItemId);
        queryClient.setQueryData<SetlistCue[] | undefined>(key, (old) => (old ? [...old, created] : [created]));
      }
      invalidateAfterCueChange(organizationId, setlistId, created.setlistItemId);
    },
  });
}

export function useCopySetlistCues(organizationId: string, setlistId: string, targetItemId: string) {
  return useMutation({
    mutationFn: (input: CopySetlistCuesInput) => copySetlistCues(setlistId, targetItemId, input),
    onSuccess: () => invalidateAfterCueChange(organizationId, setlistId, targetItemId),
  });
}
