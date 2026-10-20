import { useEffect, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '../../shared/api/query-client';
import {
  clearCurrentOrganizationId as clearPersistedCurrentOrganizationId,
  getCurrentOrganizationId as getPersistedCurrentOrganizationId,
  setCurrentOrganizationId as persistCurrentOrganizationId,
} from '../../shared/api/http';
import { createOrganization, getOrganizations } from './api/organizations.client';

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
