import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '../../shared/api/query-client';
import type { CreateInvitationInput } from '../../shared/types';
import { acceptMyInvitation, cancelInvitation, createInvitation, declineMyInvitation, getInvitations, getMyInvitations } from './api/invitations.client';

export const MY_INVITATIONS_QUERY_KEY = ['my-invitations'] as const;

/** Invitaciones pendientes para el correo de la sesion (sirve con o sin organizacion activa). */
export function useMyInvitations() {
  return useQuery({ queryKey: MY_INVITATIONS_QUERY_KEY, queryFn: getMyInvitations });
}

export function useAcceptMyInvitation() {
  return useMutation({
    mutationFn: (id: string) => acceptMyInvitation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_INVITATIONS_QUERY_KEY }),
  });
}

export function useDeclineMyInvitation() {
  return useMutation({
    mutationFn: (id: string) => declineMyInvitation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_INVITATIONS_QUERY_KEY }),
  });
}

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
