import { useQuery } from '@tanstack/react-query';
import { getSetlistCues } from '../api/setlist-cues.client';

export function useSetlistCues(organizationId: string, setlistId: string) {
  return useQuery({
    queryKey: ['setlistCues', organizationId, setlistId],
    queryFn: () => getSetlistCues(setlistId),
    enabled: Boolean(organizationId && setlistId),
  });
}
