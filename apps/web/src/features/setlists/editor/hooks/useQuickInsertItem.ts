import { useMutation } from '@tanstack/react-query';
import { queryClient } from '../../../../shared/api/query-client';
import type { CreateSetlistItemInput, SetlistDetail, SetlistItem } from '../../../../shared/types';
import { createSetlistItem } from '../../api/setlists.client';

function buildPlaceholderItem(tempId: string, input: CreateSetlistItemInput): SetlistItem {
  return {
    id: tempId,
    type: input.type,
    title: input.title || (input.type === 'SONG' ? 'Canción' : 'Item'),
    description: input.description ?? null,
    order: 0,
    songId: input.songId ?? null,
    songVersionId: input.songVersionId ?? null,
    estimatedSec: input.estimatedSec ?? null,
    keyOverride: input.keyOverride ?? null,
    bpmOverride: input.bpmOverride ?? null,
    durationOverrideSec: input.durationOverrideSec ?? null,
    capo: input.capo ?? null,
    transitionNote: input.transitionNote ?? null,
    internalNote: input.internalNote ?? null,
    includeClick: input.includeClick ?? false,
    includePad: input.includePad ?? false,
    isOptional: input.isOptional ?? false,
    isHidden: input.isHidden ?? false,
    effective: {
      key: input.keyOverride ?? null,
      bpm: input.bpmOverride ?? null,
      durationSec: input.durationOverrideSec ?? input.estimatedSec ?? null,
      capo: input.capo ?? null,
    },
    song: null,
    songVersion: null,
  };
}

function spliceAt<T>(items: T[] | undefined, index: number, value: T): T[] {
  const list = items ? [...items] : [];
  const clamped = Math.max(0, Math.min(index, list.length));
  list.splice(clamped, 0, value);
  return list;
}

function replaceTemp(items: SetlistItem[] | undefined, tempId: string, created: SetlistItem): SetlistItem[] | undefined {
  return items?.map((item) => (item.id === tempId ? created : item));
}

/**
 * Quick Insert con placeholder optimista en la posicion exacta del gap. El clamp de
 * `insertIndex` debe mantenerse coherente con `computeInsertOrder` del backend.
 */
export function useQuickInsertItem(organizationId: string, setlistId: string) {
  const itemsKey = ['setlistItems', organizationId, setlistId] as const;
  const setlistKey = ['setlist', organizationId, setlistId] as const;

  return useMutation({
    mutationFn: ({ input, insertIndex }: { input: CreateSetlistItemInput; insertIndex: number }) =>
      createSetlistItem(setlistId, { ...input, insertIndex }),
    onMutate: async ({ input, insertIndex }) => {
      await queryClient.cancelQueries({ queryKey: itemsKey });
      await queryClient.cancelQueries({ queryKey: setlistKey });

      const prevItems = queryClient.getQueryData<SetlistItem[]>(itemsKey);
      const prevSetlist = queryClient.getQueryData<SetlistDetail>(setlistKey);

      const tempId = `temp-${Math.random().toString(36).slice(2)}`;
      const placeholder = buildPlaceholderItem(tempId, input);
      const nextItems = spliceAt(prevItems, insertIndex, placeholder);

      queryClient.setQueryData(itemsKey, nextItems);
      queryClient.setQueryData<SetlistDetail | undefined>(setlistKey, (old) => (old ? { ...old, items: nextItems } : old));

      return { prevItems, prevSetlist, tempId };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevItems) queryClient.setQueryData(itemsKey, context.prevItems);
      if (context?.prevSetlist) queryClient.setQueryData(setlistKey, context.prevSetlist);
    },
    onSuccess: (created, _vars, context) => {
      if (!context) return;
      queryClient.setQueryData<SetlistItem[] | undefined>(itemsKey, (old) => replaceTemp(old, context.tempId, created));
      queryClient.setQueryData<SetlistDetail | undefined>(setlistKey, (old) =>
        old ? { ...old, items: replaceTemp(old.items, context.tempId, created) ?? old.items, itemCount: old.itemCount + 1 } : old,
      );
    },
  });
}
