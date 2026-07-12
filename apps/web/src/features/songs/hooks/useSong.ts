import { useQuery } from '@tanstack/react-query';
import { getSong } from '../api/songs.client';

export function useSong(organizationId: string, id: string) {
  return useQuery({
    queryKey: ['song', organizationId, id],
    queryFn: () => getSong(id),
    enabled: Boolean(organizationId && id),
  });
}
