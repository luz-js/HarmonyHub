import type { SetlistItem } from '../../../../shared/types';

export type TimelineEntry = { itemId: string; startSec: number };

/**
 * Hora de inicio estimada por item, calculada en cliente (nunca persistida).
 * Los items ocultos no avanzan el reloj: heredan el startSec del ultimo item visible.
 */
export function calculateRunningTimeline(items: SetlistItem[]): TimelineEntry[] {
  let clock = 0;
  return items.map((item) => {
    const entry: TimelineEntry = { itemId: item.id, startSec: clock };
    if (!item.isHidden) clock += item.effective.durationSec ?? 0;
    return entry;
  });
}
