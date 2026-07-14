import { useMutation } from '@tanstack/react-query';
import { queryClient } from '../../../../shared/api/query-client';
import type { SetlistDetail, SetlistItem } from '../../../../shared/types';
import { reorderSetlistItems } from '../../api/setlists.client';

function reorderLocally(items: SetlistItem[] | undefined, orderedIds: string[]): SetlistItem[] {
  if (!items) return [];
  const byId = new Map(items.map((item) => [item.id, item]));
  return orderedIds
    .map((id, index) => {
      const item = byId.get(id);
      return item ? { ...item, order: index } : null;
    })
    .filter((item): item is SetlistItem => item !== null);
}

/**
 * Reorder con optimistic update + rollback automatico. Reusa las query keys y el endpoint
 * de Fase 1 (`reorderSetlistItems`); no invalida/refetch en exito, escribe la respuesta
 * del servidor directamente en cache.
 */
export function useOptimisticReorder(organizationId: string, setlistId: string) {
  const itemsKey = ['setlistItems', organizationId, setlistId] as const;
  const setlistKey = ['setlist', organizationId, setlistId] as const;

  return useMutation({
    mutationFn: (itemIds: string[]) => reorderSetlistItems(setlistId, itemIds),
    onMutate: async (itemIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: itemsKey });
      await queryClient.cancelQueries({ queryKey: setlistKey });

      const prevItems = queryClient.getQueryData<SetlistItem[]>(itemsKey);
      const prevSetlist = queryClient.getQueryData<SetlistDetail>(setlistKey);

      const reordered = reorderLocally(prevItems, itemIds);
      queryClient.setQueryData(itemsKey, reordered);
      queryClient.setQueryData<SetlistDetail | undefined>(setlistKey, (old) => (old ? { ...old, items: reordered } : old));

      return { prevItems, prevSetlist };
    },
    onError: (_err, _itemIds, context) => {
      if (context?.prevItems) queryClient.setQueryData(itemsKey, context.prevItems);
      if (context?.prevSetlist) queryClient.setQueryData(setlistKey, context.prevSetlist);
    },
    onSuccess: (serverItems) => {
      queryClient.setQueryData(itemsKey, serverItems);
      queryClient.setQueryData<SetlistDetail | undefined>(setlistKey, (old) => (old ? { ...old, items: serverItems } : old));
    },
  });
}
