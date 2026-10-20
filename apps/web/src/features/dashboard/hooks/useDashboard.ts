import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from '../api/dashboard.client';

export function useDashboard(organizationId: string) {
  return useQuery({
    queryKey: ['dashboard', organizationId, 'summary'],
    queryFn: () => getDashboardSummary(),
    enabled: Boolean(organizationId),
  });
}
