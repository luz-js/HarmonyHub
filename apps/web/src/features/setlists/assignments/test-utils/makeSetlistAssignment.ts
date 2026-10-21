import type { SetlistAssignment } from '../../../../shared/types';

let counter = 0;

export function makeSetlistAssignment(overrides: Partial<SetlistAssignment> = {}): SetlistAssignment {
  counter += 1;
  return {
    id: `assignment-${counter}`,
    setlistItemId: 'item-1',
    participantId: `participant-${counter}`,
    role: 'ELECTRIC_GUITAR',
    instrument: null,
    label: null,
    isPrimary: false,
    isRequired: true,
    preparationStatus: 'PENDING',
    preparationNote: null,
    sortOrder: 0,
    participant: {
      id: `participant-${counter}`,
      status: 'CONFIRMED',
      membership: { id: `membership-${counter}`, user: { id: `user-${counter}`, name: `Musico ${counter}`, avatarUrl: null, instruments: [] } },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
