import { useQuery } from '@tanstack/react-query';
import { getSetlistProduction } from '../api/setlist-cues.client';

export function useSetlistProduction(organizationId: string, setlistId: string) {
  return useQuery({
    queryKey: ['setlistProduction', organizationId, setlistId],
    queryFn: () => getSetlistProduction(setlistId),
    enabled: Boolean(organizationId && setlistId),
  });
}
