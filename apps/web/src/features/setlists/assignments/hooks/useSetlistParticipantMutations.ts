import { useMutation } from '@tanstack/react-query';
import { queryClient } from '../../../../shared/api/query-client';
import type { AddSetlistParticipantInput, UpdateSetlistParticipantInput } from '../../../../shared/types';
import { addSetlistParticipant, removeSetlistParticipant, updateSetlistParticipant } from '../api/setlist-assignments.client';

function invalidateTeamQueries(organizationId: string, setlistId: string) {
  queryClient.invalidateQueries({ queryKey: ['setlistTeam', organizationId, setlistId] });
  queryClient.invalidateQueries({ queryKey: ['setlistParticipants', organizationId, setlistId] });
}

export function useAddSetlistParticipant(organizationId: string, setlistId: string) {
  return useMutation({
    mutationFn: (input: AddSetlistParticipantInput) => addSetlistParticipant(setlistId, input),
    onSuccess: () => invalidateTeamQueries(organizationId, setlistId),
  });
}

export function useUpdateSetlistParticipant(organizationId: string, setlistId: string) {
  return useMutation({
    mutationFn: ({ participantId, input }: { participantId: string; input: UpdateSetlistParticipantInput }) =>
      updateSetlistParticipant(setlistId, participantId, input),
    onSuccess: () => invalidateTeamQueries(organizationId, setlistId),
  });
}

export function useRemoveSetlistParticipant(organizationId: string, setlistId: string) {
  return useMutation({
    mutationFn: ({ participantId, removeAssignments }: { participantId: string; removeAssignments?: boolean }) =>
      removeSetlistParticipant(setlistId, participantId, removeAssignments),
    onSuccess: () => invalidateTeamQueries(organizationId, setlistId),
  });
}
