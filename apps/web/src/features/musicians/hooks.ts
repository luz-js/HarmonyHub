import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '../../shared/api/query-client';
import type { UpdateMembershipInput } from '../../shared/types';
import { getMemberships, updateMembership } from './api/memberships.client';

export function useMemberships(organizationId?: string) {
  return useQuery({
    queryKey: ['memberships', organizationId],
    queryFn: () => getMemberships(organizationId || ''),
    enabled: Boolean(organizationId),
  });
}

export function useUpdateMembership(organizationId?: string) {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateMembershipInput }) => updateMembership(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['memberships', organizationId] }),
  });
}
