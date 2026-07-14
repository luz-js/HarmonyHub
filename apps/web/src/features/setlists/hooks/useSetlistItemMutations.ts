import { useMutation } from '@tanstack/react-query';
import { queryClient } from '../../../shared/api/query-client';
import type { CreateSetlistItemInput, UpdateSetlistItemInput } from '../../../shared/types';
import { createSetlistItem, deleteSetlistItem, duplicateSetlistItem, reorderSetlistItems, updateSetlistItem } from '../api/setlists.client';

function invalidateItemQueries(organizationId: string, setlistId: string) {
  queryClient.invalidateQueries({ queryKey: ['setlistItems', organizationId, setlistId] });
  queryClient.invalidateQueries({ queryKey: ['setlist', organizationId, setlistId] });
  queryClient.invalidateQueries({ queryKey: ['setlists', organizationId] });
}

export function useCreateSetlistItem(organizationId: string, setlistId: string) {
  return useMutation({
    mutationFn: (input: CreateSetlistItemInput) => createSetlistItem(setlistId, input),
    onSuccess: () => invalidateItemQueries(organizationId, setlistId),
  });
}

export function useUpdateSetlistItem(organizationId: string, setlistId: string) {
  return useMutation({
    mutationFn: ({ itemId, input }: { itemId: string; input: UpdateSetlistItemInput }) => updateSetlistItem(setlistId, itemId, input),
    onSuccess: () => invalidateItemQueries(organizationId, setlistId),
  });
}

export function useDeleteSetlistItem(organizationId: string, setlistId: string) {
  return useMutation({
    mutationFn: (itemId: string) => deleteSetlistItem(setlistId, itemId),
    onSuccess: () => invalidateItemQueries(organizationId, setlistId),
  });
}

export function useDuplicateSetlistItem(organizationId: string, setlistId: string) {
  return useMutation({
    mutationFn: (itemId: string) => duplicateSetlistItem(setlistId, itemId),
    onSuccess: () => invalidateItemQueries(organizationId, setlistId),
  });
}

export function useReorderSetlistItems(organizationId: string, setlistId: string) {
  return useMutation({
    mutationFn: (itemIds: string[]) => reorderSetlistItems(setlistId, itemIds),
    onSuccess: () => invalidateItemQueries(organizationId, setlistId),
  });
}
