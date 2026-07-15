import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '../../../../shared/api/query-client';
import type { CreateSetlistRoleRequirementInput, SetlistRoleRequirement, UpdateSetlistRoleRequirementInput } from '../../../../shared/types';
import { createSetlistRoleRequirement, deleteSetlistRoleRequirement, getSetlistRoleRequirements, updateSetlistRoleRequirement } from '../api/setlist-assignments.client';

function requirementsKey(organizationId: string, setlistId: string, itemId: string) {
  return ['setlistRoleRequirements', organizationId, setlistId, itemId] as const;
}

function invalidateTeam(organizationId: string, setlistId: string) {
  queryClient.invalidateQueries({ queryKey: ['setlistTeam', organizationId, setlistId] });
}

export function useSetlistRoleRequirements(organizationId: string, setlistId: string, itemId: string) {
  return useQuery({
    queryKey: requirementsKey(organizationId, setlistId, itemId),
    queryFn: () => getSetlistRoleRequirements(setlistId, itemId),
    enabled: Boolean(organizationId && setlistId && itemId),
  });
}

export function useCreateSetlistRoleRequirement(organizationId: string, setlistId: string, itemId: string) {
  const key = requirementsKey(organizationId, setlistId, itemId);
  return useMutation({
    mutationFn: (input: CreateSetlistRoleRequirementInput) => createSetlistRoleRequirement(setlistId, itemId, input),
    onSuccess: (created) => {
      queryClient.setQueryData<SetlistRoleRequirement[] | undefined>(key, (old) => (old ? [...old, created] : [created]));
      invalidateTeam(organizationId, setlistId);
    },
  });
}

export function useUpdateSetlistRoleRequirement(organizationId: string, setlistId: string, itemId: string) {
  const key = requirementsKey(organizationId, setlistId, itemId);
  return useMutation({
    mutationFn: ({ requirementId, input }: { requirementId: string; input: UpdateSetlistRoleRequirementInput }) =>
      updateSetlistRoleRequirement(setlistId, itemId, requirementId, input),
    onSuccess: (updated) => {
      queryClient.setQueryData<SetlistRoleRequirement[] | undefined>(key, (old) =>
        old ? old.map((requirement) => (requirement.id === updated.id ? updated : requirement)) : old,
      );
      invalidateTeam(organizationId, setlistId);
    },
  });
}

export function useDeleteSetlistRoleRequirement(organizationId: string, setlistId: string, itemId: string) {
  const key = requirementsKey(organizationId, setlistId, itemId);
  return useMutation({
    mutationFn: (requirementId: string) => deleteSetlistRoleRequirement(setlistId, itemId, requirementId),
    onSuccess: (_result, requirementId) => {
      queryClient.setQueryData<SetlistRoleRequirement[] | undefined>(key, (old) => old?.filter((requirement) => requirement.id !== requirementId));
      invalidateTeam(organizationId, setlistId);
    },
  });
}
