import { describe, expect, it } from 'vitest';
import { makeSetlistAssignment } from '../test-utils/makeSetlistAssignment';
import { computeParticipantWorkload, findSameItemRoleConflicts, isOverloaded } from './assignmentConflicts';

describe('computeParticipantWorkload / isOverloaded', () => {
  it('cuenta items distintos por participante y calcula el ratio sobre el total', () => {
    const assignments = [
      makeSetlistAssignment({ participantId: 'p1', setlistItemId: 'i1' }),
      makeSetlistAssignment({ participantId: 'p1', setlistItemId: 'i2' }),
      makeSetlistAssignment({ participantId: 'p1', setlistItemId: 'i2', role: 'KEYS' }),
      makeSetlistAssignment({ participantId: 'p2', setlistItemId: 'i1' }),
    ];

    const workload = computeParticipantWorkload(assignments, 4);
    const p1 = workload.find((entry) => entry.participantId === 'p1')!;
    const p2 = workload.find((entry) => entry.participantId === 'p2')!;

    expect(p1.itemsCount).toBe(2);
    expect(p1.ratio).toBe(0.5);
    expect(p2.itemsCount).toBe(1);
    expect(p2.ratio).toBe(0.25);
  });

  it('isOverloaded exige un minimo de items en el setlist y un ratio alto', () => {
    expect(isOverloaded({ participantId: 'p1', itemsCount: 2, totalItems: 2, ratio: 1 })).toBe(false);
    expect(isOverloaded({ participantId: 'p1', itemsCount: 4, totalItems: 5, ratio: 0.8 })).toBe(true);
    expect(isOverloaded({ participantId: 'p1', itemsCount: 1, totalItems: 5, ratio: 0.2 })).toBe(false);
  });
});

describe('findSameItemRoleConflicts', () => {
  it('no reporta nada si un participante tiene menos de 3 roles en el mismo item', () => {
    const assignments = [
      makeSetlistAssignment({ participantId: 'p1', setlistItemId: 'i1', role: 'MUSIC_DIRECTOR' }),
      makeSetlistAssignment({ participantId: 'p1', setlistItemId: 'i1', role: 'KEYS' }),
    ];
    expect(findSameItemRoleConflicts(assignments)).toEqual([]);
  });

  it('reporta cuando un participante acumula 3 o mas roles distintos en el mismo item', () => {
    const assignments = [
      makeSetlistAssignment({ participantId: 'p1', setlistItemId: 'i1', role: 'MUSIC_DIRECTOR' }),
      makeSetlistAssignment({ participantId: 'p1', setlistItemId: 'i1', role: 'KEYS' }),
      makeSetlistAssignment({ participantId: 'p1', setlistItemId: 'i1', role: 'CLICK' }),
    ];
    const conflicts = findSameItemRoleConflicts(assignments);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({ itemId: 'i1', participantId: 'p1' });
    expect(conflicts[0].roles).toHaveLength(3);
  });
});
