import type { SetlistAssignment } from '../../../../shared/types';

/**
 * Advertencias suaves de UI, nunca bloqueos: el prompt pide señalar sobrecarga o
 * roles simultaneos sin impedir que el usuario los asigne (puede ser intencional,
 * ej. un musico que dirige y toca teclado a la vez).
 */

export type ParticipantWorkload = {
  participantId: string;
  itemsCount: number;
  totalItems: number;
  ratio: number;
};

const OVERLOAD_RATIO_THRESHOLD = 0.8;
const OVERLOAD_MIN_TOTAL_ITEMS = 3;
const SAME_ITEM_ROLE_CONFLICT_THRESHOLD = 3;

export function computeParticipantWorkload(assignments: SetlistAssignment[], totalItems: number): ParticipantWorkload[] {
  const itemsByParticipant = new Map<string, Set<string>>();
  for (const assignment of assignments) {
    const set = itemsByParticipant.get(assignment.participantId) ?? new Set<string>();
    set.add(assignment.setlistItemId);
    itemsByParticipant.set(assignment.participantId, set);
  }

  return Array.from(itemsByParticipant.entries()).map(([participantId, items]) => ({
    participantId,
    itemsCount: items.size,
    totalItems,
    ratio: totalItems > 0 ? items.size / totalItems : 0,
  }));
}

export function isOverloaded(workload: ParticipantWorkload): boolean {
  return workload.totalItems >= OVERLOAD_MIN_TOTAL_ITEMS && workload.ratio >= OVERLOAD_RATIO_THRESHOLD;
}

export type SameItemRoleConflict = {
  itemId: string;
  participantId: string;
  roles: string[];
};

/** Un mismo musico con muchos roles distintos en el mismo item puede indicar una asignacion equivocada. */
export function findSameItemRoleConflicts(assignments: SetlistAssignment[]): SameItemRoleConflict[] {
  const rolesByItemParticipant = new Map<string, Set<string>>();
  for (const assignment of assignments) {
    const key = `${assignment.setlistItemId}:${assignment.participantId}`;
    const set = rolesByItemParticipant.get(key) ?? new Set<string>();
    set.add(assignment.role);
    rolesByItemParticipant.set(key, set);
  }

  const conflicts: SameItemRoleConflict[] = [];
  for (const [key, roles] of rolesByItemParticipant.entries()) {
    if (roles.size < SAME_ITEM_ROLE_CONFLICT_THRESHOLD) continue;
    const [itemId, participantId] = key.split(':');
    conflicts.push({ itemId, participantId, roles: Array.from(roles) });
  }
  return conflicts;
}
