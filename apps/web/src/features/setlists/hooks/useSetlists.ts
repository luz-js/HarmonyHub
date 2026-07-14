import { useQuery } from '@tanstack/react-query';
import { getSetlists } from '../api/setlists.client';
import type { SetlistStatus } from '../../../shared/types';

export function useSetlists(
  organizationId: string,
  filters: { status?: SetlistStatus; search?: string; includeArchived?: boolean; page?: number; pageSize?: number } = {},
) {
  return useQuery({
    queryKey: ['setlists', organizationId, filters],
    queryFn: () => getSetlists(filters),
    enabled: Boolean(organizationId),
  });
}
