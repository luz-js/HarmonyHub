import type { SetlistTeamItemEntry } from '../../../../shared/types';

export type TeamSummary = {
  primaries: Array<{ role: string; name: string }>;
  extraCount: number;
  missingRolesCount: number;
  readyCount: number;
  totalCount: number;
};

export function buildTeamSummary(entry: SetlistTeamItemEntry | undefined): TeamSummary | null {
  if (!entry || entry.assignments.length === 0) return null;

  const primaries = entry.assignments
    .filter((assignment) => assignment.isPrimary)
    .map((assignment) => ({ role: assignment.role, name: assignment.participant.membership.user.name }));

  return {
    primaries,
    extraCount: Math.max(entry.assignments.length - primaries.length, 0),
    missingRolesCount: entry.coverage.missingRoles.length,
    readyCount: entry.assignments.filter((assignment) => assignment.preparationStatus === 'READY').length,
    totalCount: entry.assignments.length,
  };
}
