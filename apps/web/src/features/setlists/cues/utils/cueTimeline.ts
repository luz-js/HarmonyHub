import type { SetlistCuePhase } from '../../../../shared/types';

/** Espejo de `calculateCueTimelinePosition` en `apps/api/src/setlists/cues/setlist-cue.utils.ts`. */
export function calculateCueTimelinePosition({
  phase,
  offsetSec,
  itemStartSec,
  itemDurationSec,
}: {
  phase: SetlistCuePhase;
  offsetSec: number | null;
  itemStartSec: number | null;
  itemDurationSec: number | null;
}): number | null {
  const offset = offsetSec ?? 0;
  if (phase === 'GLOBAL') return offset;
  if (itemStartSec == null) return null;
  if (phase === 'AFTER') return itemStartSec + (itemDurationSec ?? 0) + offset;
  return itemStartSec + offset;
}

export function formatCueClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const minutesLabel = String(minutes).padStart(hours > 0 ? 2 : 1, '0');
  const secsLabel = String(secs).padStart(2, '0');
  return hours > 0 ? `${hours}:${minutesLabel}:${secsLabel}` : `${minutesLabel}:${secsLabel}`;
}
