import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '../../shared/api/query-client';
import type { CreateInvitationInput } from '../../shared/types';
import { cancelInvitation, createInvitation, getInvitations } from './api/invitations.client';

export function useInvitations(organizationId?: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['invitations', organizationId],
    queryFn: () => getInvitations(organizationId || ''),
    enabled: Boolean(organizationId) && (options.enabled ?? true),
  });
}

export function useCreateInvitation(organizationId?: string) {
  return useMutation({
    mutationFn: (input: CreateInvitationInput) => createInvitation(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invitations', organizationId] }),
  });
}

export function useCancelInvitation(organizationId?: string) {
  return useMutation({
    mutationFn: (id: string) => cancelInvitation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invitations', organizationId] }),
  });
}
