import type { SetlistCue, SetlistItem } from '../../../../shared/types';

export function getVisibleItems(items: SetlistItem[]): SetlistItem[] {
  return items.filter((item) => !item.isHidden);
}

function findItemIndex(visibleItems: SetlistItem[], itemId: string | null): number {
  if (!itemId) return -1;
  return visibleItems.findIndex((item) => item.id === itemId);
}

export function getNextItemId(visibleItems: SetlistItem[], currentItemId: string | null): string | null {
  if (visibleItems.length === 0) return null;
  const index = findItemIndex(visibleItems, currentItemId);
  if (index === -1) return visibleItems[0].id;
  return visibleItems[Math.min(index + 1, visibleItems.length - 1)].id;
}

export function getPreviousItemId(visibleItems: SetlistItem[], currentItemId: string | null): string | null {
  if (visibleItems.length === 0) return null;
  const index = findItemIndex(visibleItems, currentItemId);
  if (index === -1) return visibleItems[0].id;
  return visibleItems[Math.max(index - 1, 0)].id;
}

/** Los cues ya vienen con `timelinePositionSec` calculado por el backend (Fase 5) — solo se ordenan. */
export function sortCuesByTimeline(cues: SetlistCue[]): SetlistCue[] {
  return [...cues].sort((a, b) => (a.timelinePositionSec ?? 0) - (b.timelinePositionSec ?? 0));
}

function findCueIndex(sortedCues: SetlistCue[], cueId: string | null): number {
  if (!cueId) return -1;
  return sortedCues.findIndex((cue) => cue.id === cueId);
}

export function getNextCueId(sortedCues: SetlistCue[], currentCueId: string | null): string | null {
  if (sortedCues.length === 0) return null;
  const index = findCueIndex(sortedCues, currentCueId);
  if (index === -1) return sortedCues[0].id;
  return sortedCues[Math.min(index + 1, sortedCues.length - 1)].id;
}

export function getPreviousCueId(sortedCues: SetlistCue[], currentCueId: string | null): string | null {
  if (sortedCues.length === 0) return null;
  const index = findCueIndex(sortedCues, currentCueId);
  if (index === -1) return sortedCues[0].id;
  return sortedCues[Math.max(index - 1, 0)].id;
}

/**
 * Al cambiar de item (siguiente/anterior/salto), el cursor de cue se resincroniza al primer
 * cue de fase BEFORE del nuevo item actual (o al primer cue de cualquier fase si no hay
 * ninguno en BEFORE) — evita que el operador tenga que rebuscar manualmente tras avanzar.
 */
export function findFirstCueForItem(sortedCues: SetlistCue[], itemId: string | null): string | null {
  if (!itemId) return null;
  const beforeCue = sortedCues.find((cue) => cue.setlistItemId === itemId && cue.phase === 'BEFORE');
  if (beforeCue) return beforeCue.id;
  const anyCue = sortedCues.find((cue) => cue.setlistItemId === itemId);
  return anyCue?.id ?? null;
}
