import { useQuery } from '@tanstack/react-query';
import { getSetlistTeam } from '../api/setlist-assignments.client';

export function useSetlistTeam(organizationId: string, setlistId: string) {
  return useQuery({
    queryKey: ['setlistTeam', organizationId, setlistId],
    queryFn: () => getSetlistTeam(setlistId),
    enabled: Boolean(organizationId && setlistId),
  });
}
