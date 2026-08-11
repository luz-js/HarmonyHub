import { useQuery } from '@tanstack/react-query';
import { getSetlistItemCues } from '../api/setlist-cues.client';

export function useSetlistItemCues(organizationId: string, setlistId: string, itemId: string) {
  return useQuery({
    queryKey: ['setlistItemCues', organizationId, setlistId, itemId],
    queryFn: () => getSetlistItemCues(setlistId, itemId),
    enabled: Boolean(organizationId && setlistId && itemId),
  });
}
