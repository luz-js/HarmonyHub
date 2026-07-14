import type { SetlistItem } from '../../../../shared/types';

export function makeSetlistItem(overrides: Partial<SetlistItem> = {}): SetlistItem {
  return {
    id: 'item',
    type: 'SONG',
    title: 'Item',
    description: null,
    order: 0,
    songId: null,
    songVersionId: null,
    estimatedSec: null,
    keyOverride: null,
    bpmOverride: null,
    durationOverrideSec: null,
    capo: null,
    transitionNote: null,
    internalNote: null,
    includeClick: false,
    includePad: false,
    isOptional: false,
    isHidden: false,
    effective: { key: null, bpm: null, durationSec: null, capo: null },
    ...overrides,
  };
}
