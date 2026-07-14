import { useMutation } from '@tanstack/react-query';
import { queryClient } from '../../../shared/api/query-client';
import type { SetlistStatus } from '../../../shared/types';
import { archiveSetlist, createSetlist, deleteSetlist, publishSetlist, updateSetlist } from '../api/setlists.client';

function invalidateSetlistQueries(organizationId: string, setlistId?: string) {
  queryClient.invalidateQueries({ queryKey: ['setlists', organizationId] });
  if (setlistId) queryClient.invalidateQueries({ queryKey: ['setlist', organizationId, setlistId] });
}

export function useCreateSetlist(organizationId: string) {
  return useMutation({
    mutationFn: (input: { name: string; description?: string; status?: 'DRAFT' | 'READY' | 'PUBLISHED' }) => createSetlist(input),
    onSuccess: () => invalidateSetlistQueries(organizationId),
  });
}

export function useUpdateSetlist(organizationId: string) {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name?: string; description?: string | null; status?: SetlistStatus } }) => updateSetlist(id, input),
    onSuccess: (_data, variables) => invalidateSetlistQueries(organizationId, variables.id),
  });
}

export function useArchiveSetlist(organizationId: string) {
  return useMutation({
    mutationFn: (id: string) => archiveSetlist(id),
    onSuccess: (_data, id) => invalidateSetlistQueries(organizationId, id),
  });
}

export function usePublishSetlist(organizationId: string) {
  return useMutation({
    mutationFn: (id: string) => publishSetlist(id),
    onSuccess: (_data, id) => invalidateSetlistQueries(organizationId, id),
  });
}

export function useDeleteSetlist(organizationId: string) {
  return useMutation({
    mutationFn: (id: string) => deleteSetlist(id),
    onSuccess: () => invalidateSetlistQueries(organizationId),
  });
}
