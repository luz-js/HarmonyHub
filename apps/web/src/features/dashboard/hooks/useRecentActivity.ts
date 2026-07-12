import { useQuery } from '@tanstack/react-query';
import { notifications } from '../../../data';

export function useRecentActivity() {
  return useQuery({
    queryKey: ['dashboard', 'recent-activity'],
    queryFn: () => notifications,
  });
}
