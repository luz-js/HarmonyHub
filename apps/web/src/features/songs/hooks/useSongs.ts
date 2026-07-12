import { useQuery } from '@tanstack/react-query';
import { getSongs } from '../api/songs.client';

export function useSongs(organizationId: string, filters: Record<string, string> = {}) {
  return useQuery({
    queryKey: ['songs', organizationId, filters],
    queryFn: () => getSongs(organizationId, filters),
    enabled: Boolean(organizationId),
  });
}
