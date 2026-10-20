import { useQuery } from '@tanstack/react-query';
import { getDashboardActivity } from '../api/dashboard.client';

export function useRecentActivity(organizationId: string, limit = 30) {
  return useQuery({
    queryKey: ['dashboard', organizationId, 'activity', limit],
    queryFn: () => getDashboardActivity(limit),
    enabled: Boolean(organizationId),
  });
}
