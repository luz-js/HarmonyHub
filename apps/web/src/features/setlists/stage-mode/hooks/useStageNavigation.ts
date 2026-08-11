import { useMemo } from 'react';
import { useSetlistItems } from '../../hooks';
import { getNextItemId, getPreviousItemId, getVisibleItems } from '../utils/stageNavigation.utils';
import type { PerSetlistStageState } from './useStagePersistence';

export function useStageNavigation(
  organizationId: string,
  setlistId: string,
  state: PerSetlistStageState,
  update: (patch: Partial<PerSetlistStageState>, debounceMs?: number) => void,
) {
  const itemsQuery = useSetlistItems(organizationId, setlistId);
  const items = itemsQuery.data ?? [];
  const visibleItems = useMemo(() => getVisibleItems(items), [items]);

  const currentItemId = state.currentItemId ?? visibleItems[0]?.id ?? null;
  const currentIndex = visibleItems.findIndex((item) => item.id === currentItemId);
  const currentItem = currentIndex >= 0 ? visibleItems[currentIndex] : null;
  const previousItem = currentIndex > 0 ? visibleItems[currentIndex - 1] : null;
  const nextItem = currentIndex >= 0 && currentIndex < visibleItems.length - 1 ? visibleItems[currentIndex + 1] : null;

  function goToItem(itemId: string) {
    update({ currentItemId: itemId });
  }

  function goToNext() {
    const nextId = getNextItemId(visibleItems, currentItemId);
    if (nextId) update({ currentItemId: nextId });
  }

  function goToPrevious() {
    const previousId = getPreviousItemId(visibleItems, currentItemId);
    if (previousId) update({ currentItemId: previousId });
  }

  return {
    items,
    visibleItems,
    currentItemId,
    currentItem,
    currentIndex,
    previousItem,
    nextItem,
    goToItem,
    goToNext,
    goToPrevious,
    isLoading: itemsQuery.isLoading,
  };
}
