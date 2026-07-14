import { useQuery } from '@tanstack/react-query';
import { getSetlist } from '../api/setlists.client';

export function useSetlist(organizationId: string, setlistId: string) {
  return useQuery({
    queryKey: ['setlist', organizationId, setlistId],
    queryFn: () => getSetlist(setlistId),
    enabled: Boolean(organizationId && setlistId),
  });
}
