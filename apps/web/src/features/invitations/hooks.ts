import { useMutation, useQuery } from '@tanstack/react-query';
import { createInvitation, getInvitations } from './api/invitations.client';

export function useInvitations(organizationId?: string) {
  return useQuery({
    queryKey: ['invitations', organizationId],
    queryFn: () => getInvitations(organizationId || ''),
    enabled: Boolean(organizationId),
  });
}

export function useCreateInvitation() {
  return useMutation({
    mutationFn: createInvitation,
  });
}
