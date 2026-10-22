import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '../../../shared/api/query-client';
import type { CreateShareLinkInput } from '../../../shared/types';
import { createShareLink, getShareLinks, revokeShareLink } from '../api/setlists.client';

const shareLinksKey = (organizationId: string, setlistId: string) => ['setlist-share-links', organizationId, setlistId];

/** Enlaces de solo lectura activos de un setlist (solo para quien puede editarlo). */
export function useShareLinks(organizationId: string, setlistId: string, enabled = true) {
  return useQuery({
    queryKey: shareLinksKey(organizationId, setlistId),
    queryFn: () => getShareLinks(setlistId),
    enabled: enabled && Boolean(organizationId && setlistId),
  });
}

export function useCreateShareLink(organizationId: string, setlistId: string) {
  return useMutation({
    mutationFn: (input: CreateShareLinkInput) => createShareLink(setlistId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: shareLinksKey(organizationId, setlistId) }),
  });
}

export function useRevokeShareLink(organizationId: string, setlistId: string) {
  return useMutation({
    mutationFn: (linkId: string) => revokeShareLink(setlistId, linkId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: shareLinksKey(organizationId, setlistId) }),
  });
}
