import { useMutation, useQuery } from '@tanstack/react-query';
import { getMemberships, updateMembership } from './api/memberships.client';

export function useMemberships(organizationId?: string) {
  return useQuery({
    queryKey: ['memberships', organizationId],
    queryFn: () => getMemberships(organizationId || ''),
    enabled: Boolean(organizationId),
  });
}

export function useUpdateMembership() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { role?: string; status?: string; instrument?: string } }) => updateMembership(id, input),
  });
}
