import type { SetlistCue } from '../../../../shared/types';

let counter = 0;

export function makeSetlistCue(overrides: Partial<SetlistCue> = {}): SetlistCue {
  counter += 1;
  return {
    id: `cue-${counter}`,
    setlistId: 'setlist-1',
    setlistItemId: null,
    type: 'CUSTOM',
    category: 'CUSTOM',
    phase: 'GLOBAL',
    status: 'PENDING',
    priority: 'NORMAL',
    title: `Cue ${counter}`,
    description: null,
    offsetSec: 0,
    durationSec: null,
    sortOrder: 0,
    metadata: null,
    isOptional: false,
    isHidden: false,
    responsibleParticipant: null,
    responsibleAssignment: null,
    timelinePositionSec: 0,
    createdBy: null,
    completedBy: null,
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
