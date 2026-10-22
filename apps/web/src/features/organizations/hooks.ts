import { useEffect, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '../../shared/api/query-client';
import {
  clearCurrentOrganizationId as clearPersistedCurrentOrganizationId,
  getCurrentOrganizationId as getPersistedCurrentOrganizationId,
  setCurrentOrganizationId as persistCurrentOrganizationId,
} from '../../shared/api/http';
import { archiveOrganization, createOrganization, getOrganizations, leaveOrganization, restoreOrganization, transferOrganization } from './api/organizations.client';

export function getStoredCurrentOrganizationId() {
  return getPersistedCurrentOrganizationId();
}

export function setStoredCurrentOrganizationId(id: string) {
  persistCurrentOrganizationId(id);
  queryClient.invalidateQueries();
}

export function clearStoredCurrentOrganizationId() {
  clearPersistedCurrentOrganizationId();
  queryClient.invalidateQueries();
}

export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: () => getOrganizations(),
  });
}

export function useCreateOrganization() {
  return useMutation({
    mutationFn: (input: { name: string; type: string; description?: string; primaryColor?: string }) => createOrganization(input),
  });
}

/** Salir, transferir, archivar o restaurar: refresca la lista de organizaciones (el selector) al terminar. */
function useOrganizationAction<TInput>(action: (input: TInput) => Promise<unknown>) {
  return useMutation({
    mutationFn: action,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }),
  });
}

export const useLeaveOrganization = () => useOrganizationAction((id: string) => leaveOrganization(id));
export const useTransferOrganization = () =>
  useOrganizationAction((input: { id: string; membershipId: string; stepDown: boolean }) => transferOrganization(input.id, input));
export const useArchiveOrganization = () => useOrganizationAction((input: { id: string; confirmName: string }) => archiveOrganization(input.id, input.confirmName));
export const useRestoreOrganization = () => useOrganizationAction((id: string) => restoreOrganization(id));

export function useCurrentOrganization(organizations: Array<{ organization: { id: string } }> = []) {
  const currentOrganizationId = getStoredCurrentOrganizationId();
  const validOrganizationIds = useMemo(() => organizations.map((item) => item.organization.id), [organizations]);
  const selectedId = currentOrganizationId && validOrganizationIds.includes(currentOrganizationId)
    ? currentOrganizationId
    : validOrganizationIds.length === 1
      ? validOrganizationIds[0]
      : undefined;

  useEffect(() => {
    if (selectedId && selectedId !== currentOrganizationId) {
      setStoredCurrentOrganizationId(selectedId);
    }
  }, [currentOrganizationId, selectedId]);

  useEffect(() => {
    if (currentOrganizationId && organizations.length > 0 && !validOrganizationIds.includes(currentOrganizationId)) {
      clearStoredCurrentOrganizationId();
    }
  }, [currentOrganizationId, organizations.length, validOrganizationIds]);

  return {
    currentOrganizationId: selectedId,
    setCurrentOrganizationId: setStoredCurrentOrganizationId,
    clearCurrentOrganizationId: clearStoredCurrentOrganizationId,
    needsOrganizationOnboarding: organizations.length === 0,
    needsOrganizationSelection: organizations.length > 1 && !selectedId,
  };
}
