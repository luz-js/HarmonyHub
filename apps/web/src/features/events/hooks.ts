import { useQuery } from '@tanstack/react-query';
import { events, musicians } from '../../data';

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: () => events,
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: () => events.find((event) => event.id === id) ?? null,
    enabled: Boolean(id),
  });
}

export function useEventMusicians(eventId: string) {
  return useQuery({
    queryKey: ['events', eventId, 'musicians'],
    queryFn: () => musicians,
    enabled: Boolean(eventId),
  });
}
