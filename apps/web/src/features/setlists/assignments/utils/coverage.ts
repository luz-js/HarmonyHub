import type { SetlistAssignment, SetlistItemCoverage, SetlistMusicalRole, SetlistRoleRequirement } from '../../../../shared/types';

/**
 * Espejo en el frontend de `computeCoverage` en `apps/api/src/setlists/assignments/setlist-assignment.utils.ts`:
 * se usa aqui para mostrar cobertura de un solo item sin esperar el agregado completo de `/team`.
 */
export function computeItemCoverage(assignments: SetlistAssignment[], requirements: SetlistRoleRequirement[]): SetlistItemCoverage {
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
    if (assignedCount >= requirement.minimumCount) coveredRoles += 1;
    else missingRoles.push({ role: requirement.role, label: requirement.label, requiredCount: requirement.minimumCount, assignedCount });
  }

  const status = missingRoles.length === 0 ? 'COMPLETE' : coveredRoles === 0 ? 'EMPTY' : 'PARTIAL';
  return { requiredRoles: requirements.length, coveredRoles, missingRoles, status };
}
