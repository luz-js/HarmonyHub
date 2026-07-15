import type { AssignmentPreparationStatus, SetlistItemType, SetlistMusicalRole } from '@prisma/client';

/** Duplicado en forma de tupla del enum Prisma `SetlistMusicalRole`, unica forma de usarlo en `z.enum(...)`. */
export const SETLIST_MUSICAL_ROLES = [
  'MUSIC_DIRECTOR', 'BAND_LEADER', 'LEAD_VOCAL', 'BACKING_VOCAL', 'CHOIR',
  'ACOUSTIC_GUITAR', 'ELECTRIC_GUITAR', 'BASS', 'DRUMS', 'PERCUSSION', 'PIANO', 'KEYS', 'ORGAN', 'SYNTH', 'STRINGS', 'BRASS', 'WOODWIND', 'VIOLIN', 'CELLO',
  'TRACKS', 'CLICK', 'PAD',
  'AUDIO_ENGINEER', 'MONITOR_ENGINEER', 'LIGHTING', 'VIDEO',
  'SPEAKER', 'PRAYER_LEADER', 'ANNOUNCER',
  'OTHER',
] as const satisfies readonly SetlistMusicalRole[];

/** Duplicado en forma de tupla del enum Prisma `AssignmentPreparationStatus`, unica forma de usarlo en `z.enum(...)`. */
export const ASSIGNMENT_PREPARATION_STATUSES = [
  'PENDING', 'IN_PROGRESS', 'READY', 'NEEDS_REVIEW', 'BLOCKED', 'NOT_APPLICABLE',
] as const satisfies readonly AssignmentPreparationStatus[];

/** Roles de los que solo puede existir un "principal" a la vez por item (se desmarca el anterior, nunca se rechaza). */
export const SINGLE_PRIMARY_ROLES = new Set<SetlistMusicalRole>(['MUSIC_DIRECTOR', 'BAND_LEADER', 'LEAD_VOCAL', 'TRACKS', 'CLICK']);

export function isSinglePrimaryRole(role: SetlistMusicalRole): boolean {
  return SINGLE_PRIMARY_ROLES.has(role);
}

/**
 * Roles sugeridos por tipo de item — solo para filtrar el selector en el frontend.
 * El backend acepta cualquier role valido del enum; esto no es una restriccion de integridad.
 */
export const ROLES_BY_ITEM_TYPE: Record<SetlistItemType, SetlistMusicalRole[]> = {
  SONG: [
    'MUSIC_DIRECTOR', 'BAND_LEADER', 'LEAD_VOCAL', 'BACKING_VOCAL', 'CHOIR',
    'ACOUSTIC_GUITAR', 'ELECTRIC_GUITAR', 'BASS', 'DRUMS', 'PERCUSSION', 'PIANO', 'KEYS', 'ORGAN', 'SYNTH', 'STRINGS', 'BRASS', 'WOODWIND', 'VIOLIN', 'CELLO',
    'TRACKS', 'CLICK', 'PAD',
    'AUDIO_ENGINEER', 'MONITOR_ENGINEER', 'OTHER',
  ],
  PRAYER: ['PRAYER_LEADER', 'MUSIC_DIRECTOR', 'OTHER'],
  SPEAKING: ['SPEAKER', 'OTHER'],
  ANNOUNCEMENT: ['ANNOUNCER', 'OTHER'],
  VIDEO: ['VIDEO', 'AUDIO_ENGINEER', 'OTHER'],
  SILENCE: ['MUSIC_DIRECTOR', 'OTHER'],
  TRANSITION: ['MUSIC_DIRECTOR', 'KEYS', 'PAD', 'CLICK', 'OTHER'],
  BREAK: ['OTHER'],
  CUSTOM: ['MUSIC_DIRECTOR', 'OTHER'],
};

export type SetlistItemCoverageStatus = 'COMPLETE' | 'PARTIAL' | 'EMPTY';

export interface SetlistItemCoverage {
  requiredRoles: number;
  coveredRoles: number;
  missingRoles: Array<{ role: SetlistMusicalRole; label: string | null; requiredCount: number; assignedCount: number }>;
  status: SetlistItemCoverageStatus;
}

type CoverageAssignment = { role: SetlistMusicalRole };
type CoverageRequirement = { role: SetlistMusicalRole; minimumCount: number; label?: string | null };

/**
 * Calcula cobertura sin persistir nada. Sin requisitos definidos: EMPTY si no hay ninguna
 * asignacion, COMPLETE si hay al menos una — no se impone una banda completa universal
 * (el usuario configura los requisitos que le importan).
 */
export function computeCoverage(assignments: CoverageAssignment[], requirements: CoverageRequirement[]): SetlistItemCoverage {
  if (requirements.length === 0) {
    return { requiredRoles: 0, coveredRoles: 0, missingRoles: [], status: assignments.length === 0 ? 'EMPTY' : 'COMPLETE' };
  }

  const countByRole = new Map<SetlistMusicalRole, number>();
  for (const assignment of assignments) {
    countByRole.set(assignment.role, (countByRole.get(assignment.role) ?? 0) + 1);
  }

  const missingRoles: SetlistItemCoverage['missingRoles'] = [];
  let coveredRoles = 0;

  for (const requirement of requirements) {
    const assignedCount = countByRole.get(requirement.role) ?? 0;
    if (assignedCount >= requirement.minimumCount) {
      coveredRoles += 1;
    } else {
      missingRoles.push({ role: requirement.role, label: requirement.label ?? null, requiredCount: requirement.minimumCount, assignedCount });
    }
  }

  const status: SetlistItemCoverageStatus = missingRoles.length === 0 ? 'COMPLETE' : coveredRoles === 0 ? 'EMPTY' : 'PARTIAL';
  return { requiredRoles: requirements.length, coveredRoles, missingRoles, status };
}

/** No copiar READY al copiar asignaciones entre items: el equipo del destino siempre empieza a preparar de nuevo. */
export function resetPreparationForCopy(_source: AssignmentPreparationStatus): AssignmentPreparationStatus {
  return 'PENDING';
}
