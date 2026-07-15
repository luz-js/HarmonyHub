import { useQuery } from '@tanstack/react-query';
import { getSetlistParticipants } from '../api/setlist-assignments.client';

export function useSetlistParticipants(organizationId: string, setlistId: string) {
  return useQuery({
    queryKey: ['setlistParticipants', organizationId, setlistId],
    queryFn: () => getSetlistParticipants(setlistId),
    enabled: Boolean(organizationId && setlistId),
  });
}
