import type { SetlistItem } from '../../../../shared/types';

function sumDuration(items: SetlistItem[], predicate: (item: SetlistItem) => boolean): number {
  return items
    .filter((item) => !item.isHidden && predicate(item))
    .reduce((total, item) => total + (item.effective.durationSec ?? 0), 0);
}

/** Duracion musical: suma de items tipo SONG visibles. */
export function calculateMusicDuration(items: SetlistItem[]): number {
  return sumDuration(items, (item) => item.type === 'SONG');
}

/** Duracion "hablada"/no musical: suma de items visibles que no son SONG. */
export function calculateSpeakingDuration(items: SetlistItem[]): number {
  return sumDuration(items, (item) => item.type !== 'SONG');
}

/** Duracion total estimada: musica + hablado (espeja calculateSetlistEstimatedSec del backend). */
export function calculateTotalDuration(items: SetlistItem[]): number {
  return calculateMusicDuration(items) + calculateSpeakingDuration(items);
}
