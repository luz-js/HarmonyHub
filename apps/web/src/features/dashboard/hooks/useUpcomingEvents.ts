import { useQuery } from '@tanstack/react-query';
import { events } from '../../../data';

export function useUpcomingEvents() {
  return useQuery({
    queryKey: ['dashboard', 'upcoming-events'],
    queryFn: () => [...events].sort((a, b) => a.date.localeCompare(b.date)),
  });
}
