import { useMutation } from '@tanstack/react-query';
import { queryClient } from '../../../../shared/api/query-client';
import type {
  CopySetlistAssignmentsInput,
  CreateSetlistAssignmentInput,
  SetlistAssignment,
  UpdateAssignmentPreparationInput,
  UpdateSetlistAssignmentInput,
} from '../../../../shared/types';
import {
  copySetlistAssignments,
  createSetlistAssignment,
  deleteSetlistAssignment,
  updateSetlistAssignment,
  updateSetlistAssignmentPreparation,
} from '../api/setlist-assignments.client';

function itemAssignmentsKey(organizationId: string, setlistId: string, itemId: string) {
  return ['setlistItemAssignments', organizationId, setlistId, itemId] as const;
}

function invalidateTeam(organizationId: string, setlistId: string) {
  queryClient.invalidateQueries({ queryKey: ['setlistTeam', organizationId, setlistId] });
}

export function useCreateSetlistAssignment(organizationId: string, setlistId: string, itemId: string) {
  const key = itemAssignmentsKey(organizationId, setlistId, itemId);
  return useMutation({
    mutationFn: (input: CreateSetlistAssignmentInput) => createSetlistAssignment(setlistId, itemId, input),
    onSuccess: (created) => {
      queryClient.setQueryData<SetlistAssignment[] | undefined>(key, (old) => (old ? [...old, created] : [created]));
      invalidateTeam(organizationId, setlistId);
    },
  });
}

export function useUpdateSetlistAssignment(organizationId: string, setlistId: string, itemId: string) {
  const key = itemAssignmentsKey(organizationId, setlistId, itemId);
  return useMutation({
    mutationFn: ({ assignmentId, input }: { assignmentId: string; input: UpdateSetlistAssignmentInput }) =>
      updateSetlistAssignment(setlistId, itemId, assignmentId, input),
    onMutate: async ({ assignmentId, input }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<SetlistAssignment[]>(key);
      queryClient.setQueryData<SetlistAssignment[] | undefined>(key, (old) => {
        if (!old) return old;
        const target = old.find((assignment) => assignment.id === assignmentId);
        const role = input.role ?? target?.role;
        return old.map((assignment) => {
          if (assignment.id === assignmentId) return { ...assignment, ...input };
          if (input.isPrimary && role && assignment.role === role) return { ...assignment, isPrimary: false };
          return assignment;
        });
      });
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(key, context.prev);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<SetlistAssignment[] | undefined>(key, (old) =>
        old ? old.map((assignment) => (assignment.id === updated.id ? updated : assignment)) : old,
      );
      invalidateTeam(organizationId, setlistId);
    },
  });
}

export function useDeleteSetlistAssignment(organizationId: string, setlistId: string, itemId: string) {
  const key = itemAssignmentsKey(organizationId, setlistId, itemId);
  return useMutation({
    mutationFn: (assignmentId: string) => deleteSetlistAssignment(setlistId, itemId, assignmentId),
    onMutate: async (assignmentId: string) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<SetlistAssignment[]>(key);
      queryClient.setQueryData<SetlistAssignment[] | undefined>(key, (old) => old?.filter((assignment) => assignment.id !== assignmentId));
      return { prev };
    },
    onError: (_err, _assignmentId, context) => {
      if (context?.prev) queryClient.setQueryData(key, context.prev);
    },
    onSuccess: () => invalidateTeam(organizationId, setlistId),
  });
}

export function useUpdateSetlistAssignmentPreparation(organizationId: string, setlistId: string, itemId: string) {
  const key = itemAssignmentsKey(organizationId, setlistId, itemId);
  return useMutation({
    mutationFn: ({ assignmentId, input }: { assignmentId: string; input: UpdateAssignmentPreparationInput }) =>
      updateSetlistAssignmentPreparation(setlistId, itemId, assignmentId, input),
    onMutate: async ({ assignmentId, input }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<SetlistAssignment[]>(key);
      queryClient.setQueryData<SetlistAssignment[] | undefined>(key, (old) =>
        old?.map((assignment) => (assignment.id === assignmentId ? { ...assignment, ...input } : assignment)),
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(key, context.prev);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<SetlistAssignment[] | undefined>(key, (old) =>
        old ? old.map((assignment) => (assignment.id === updated.id ? updated : assignment)) : old,
      );
      invalidateTeam(organizationId, setlistId);
    },
  });
}

export function useCopySetlistAssignments(organizationId: string, setlistId: string, itemId: string) {
  const key = itemAssignmentsKey(organizationId, setlistId, itemId);
  return useMutation({
    mutationFn: (input: CopySetlistAssignmentsInput) => copySetlistAssignments(setlistId, itemId, input),
    onSuccess: (assignments) => {
      queryClient.setQueryData(key, assignments);
      invalidateTeam(organizationId, setlistId);
    },
  });
}
