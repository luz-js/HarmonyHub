import { useMemo } from 'react';
import { useEvents } from '../../events/hooks';

/** Proximos eventos desde el inicio de hoy, en orden cronologico. */
export function useUpcomingEvents(organizationId: string, limit = 5) {
  const from = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString();
  }, []);
  return useEvents(organizationId, { from, order: 'asc', pageSize: limit });
}
