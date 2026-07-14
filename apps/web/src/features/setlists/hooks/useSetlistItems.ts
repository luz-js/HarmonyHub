import { useQuery } from '@tanstack/react-query';
import { getSetlistItems } from '../api/setlists.client';

export function useSetlistItems(organizationId: string, setlistId: string) {
  return useQuery({
    queryKey: ['setlistItems', organizationId, setlistId],
    queryFn: () => getSetlistItems(setlistId),
    enabled: Boolean(organizationId && setlistId),
  });
}
