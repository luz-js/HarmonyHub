import { useQuery } from '@tanstack/react-query';
import { getSetlistItemAssignments } from '../api/setlist-assignments.client';

export function useSetlistItemAssignments(organizationId: string, setlistId: string, itemId: string) {
  return useQuery({
    queryKey: ['setlistItemAssignments', organizationId, setlistId, itemId],
    queryFn: () => getSetlistItemAssignments(setlistId, itemId),
    enabled: Boolean(organizationId && setlistId && itemId),
  });
}
