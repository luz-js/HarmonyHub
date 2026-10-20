import { useSetlists } from '../../setlists/hooks';
import type { EventSetlistOption } from '../components';

/** Setlists que se pueden vincular a un evento: no plantillas y no archivados (el listado ya excluye archivados). */
export function useEventSetlistOptions(organizationId: string): EventSetlistOption[] {
  const setlistsQuery = useSetlists(organizationId, { isTemplate: false, pageSize: 100 });
  return (setlistsQuery.data?.items || [])
    .filter((setlist) => setlist.status !== 'ARCHIVED')
    .map((setlist) => ({ id: setlist.id, name: setlist.name }));
}
