import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '../../shared/api/query-client';
import type { CreateUnavailabilityInput, MemberAvailability } from '../../shared/types';
import { createMyUnavailability, deleteMyUnavailability, getEventAvailability, getMyUnavailability, getSetlistAvailability } from './api/availability.client';

const keys = {
  all: ['availability'] as const,
  mine: ['availability', 'mine'] as const,
  event: (organizationId: string, eventId: string) => ['availability', 'event', organizationId, eventId] as const,
  setlist: (organizationId: string, setlistId: string) => ['availability', 'setlist', organizationId, setlistId] as const,
};

/** Al cambiar las fechas propias o un equipo, cambian los avisos de choque en todas partes. */
export function refreshAvailability() {
  return queryClient.invalidateQueries({ queryKey: keys.all });
}

export function useMyUnavailability() {
  return useQuery({ queryKey: keys.mine, queryFn: getMyUnavailability });
}

export function useAddUnavailability() {
  return useMutation({ mutationFn: (input: CreateUnavailabilityInput) => createMyUnavailability(input), onSuccess: refreshAvailability });
}

export function useDeleteUnavailability() {
  return useMutation({ mutationFn: (id: string) => deleteMyUnavailability(id), onSuccess: refreshAvailability });
}

/** Solo para quien arma el equipo (la API responde 403 a musicos e invitados): por eso `enabled`. */
export function useEventAvailability(organizationId: string, eventId: string, enabled: boolean) {
  return useQuery({ queryKey: keys.event(organizationId, eventId), queryFn: () => getEventAvailability(eventId), enabled: enabled && Boolean(eventId) });
}

export function useSetlistAvailability(organizationId: string, setlistId: string, enabled: boolean) {
  return useQuery({ queryKey: keys.setlist(organizationId, setlistId), queryFn: () => getSetlistAvailability(setlistId), enabled: enabled && Boolean(setlistId) });
}

/** Lista -> mapa por membresia, para buscar rapido desde los selectores. */
export function availabilityByMembership(members: MemberAvailability[] | undefined) {
  return new Map((members ?? []).map((member) => [member.membershipId, member]));
}
