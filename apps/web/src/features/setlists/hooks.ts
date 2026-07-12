import { useQuery } from '@tanstack/react-query';
import { setlists } from '../../data';

export function useSetlists() {
  return useQuery({
    queryKey: ['setlists'],
    queryFn: () => setlists,
  });
}

export function useSetlist(id: string) {
  return useQuery({
    queryKey: ['setlists', id],
    queryFn: () => setlists.find((setlist) => setlist.id === id) ?? null,
    enabled: Boolean(id),
  });
}
