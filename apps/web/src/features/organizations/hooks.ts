import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '../../shared/api/query-client';
import { createOrganization, getOrganizations } from './api/organizations.client';

const CURRENT_ORG_KEY = 'hh_current_organization_id';

export function getStoredCurrentOrganizationId() {
  return localStorage.getItem(CURRENT_ORG_KEY) || undefined;
}

export function setStoredCurrentOrganizationId(id: string) {
  localStorage.setItem(CURRENT_ORG_KEY, id);
  queryClient.invalidateQueries();
}

export function clearStoredCurrentOrganizationId() {
  localStorage.removeItem(CURRENT_ORG_KEY);
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
  const validOrganizationIds = organizations.map((item) => item.organization.id);
  const selectedId = currentOrganizationId && validOrganizationIds.includes(currentOrganizationId)
    ? currentOrganizationId
    : validOrganizationIds.length === 1
      ? validOrganizationIds[0]
      : undefined;

  if (selectedId && selectedId !== currentOrganizationId) {
    localStorage.setItem(CURRENT_ORG_KEY, selectedId);
  }

  if (currentOrganizationId && organizations.length > 0 && !validOrganizationIds.includes(currentOrganizationId)) {
    clearStoredCurrentOrganizationId();
  }

  return {
    currentOrganizationId: selectedId,
    setCurrentOrganizationId: setStoredCurrentOrganizationId,
    clearCurrentOrganizationId: clearStoredCurrentOrganizationId,
    needsOrganizationOnboarding: organizations.length === 0,
    needsOrganizationSelection: organizations.length > 1 && !selectedId,
  };
}
