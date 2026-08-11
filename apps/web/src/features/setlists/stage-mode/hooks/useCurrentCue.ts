import { useMemo } from 'react';
import { useSetlistCues } from '../../cues/hooks/useSetlistCues';
import { findFirstCueForItem, getNextCueId, getPreviousCueId, sortCuesByTimeline } from '../utils/stageNavigation.utils';
import type { PerSetlistStageState } from './useStagePersistence';

export function useCurrentCue(
  organizationId: string,
  setlistId: string,
  currentItemId: string | null,
  state: PerSetlistStageState,
  update: (patch: Partial<PerSetlistStageState>, debounceMs?: number) => void,
) {
  const cuesQuery = useSetlistCues(organizationId, setlistId);
  const cues = cuesQuery.data ?? [];
  const sortedCues = useMemo(() => sortCuesByTimeline(cues), [cues]);

  const currentCueId = state.currentCueId ?? findFirstCueForItem(sortedCues, currentItemId);
  const currentIndex = sortedCues.findIndex((cue) => cue.id === currentCueId);
  const currentCue = currentIndex >= 0 ? sortedCues[currentIndex] : null;
  const nextCue = currentIndex >= 0 && currentIndex < sortedCues.length - 1 ? sortedCues[currentIndex + 1] : null;
  const previousCue = currentIndex > 0 ? sortedCues[currentIndex - 1] : null;

  function goToCue(cueId: string) {
    update({ currentCueId: cueId });
  }

  function goToNextCue() {
    const nextId = getNextCueId(sortedCues, currentCueId);
    if (nextId) update({ currentCueId: nextId });
  }

  function goToPreviousCue() {
    const previousId = getPreviousCueId(sortedCues, currentCueId);
    if (previousId) update({ currentCueId: previousId });
  }

  /** Se llama al navegar de item (siguiente/anterior/salto) para resincronizar el cursor de cue. */
  function syncToItem(itemId: string | null) {
    const firstCueId = findFirstCueForItem(sortedCues, itemId);
    if (firstCueId && firstCueId !== currentCueId) update({ currentCueId: firstCueId });
  }

  return {
    cues: sortedCues,
    currentCue,
    nextCue,
    previousCue,
    goToCue,
    goToNextCue,
    goToPreviousCue,
    syncToItem,
    isLoading: cuesQuery.isLoading,
  };
}
