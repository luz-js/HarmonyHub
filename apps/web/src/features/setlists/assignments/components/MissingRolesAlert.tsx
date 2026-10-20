import { AlertTriangle } from 'lucide-react';
import type { SetlistItemCoverage } from '../../../../shared/types';
import { getRoleLabel } from '../utils/assignmentLabels';

/** Advertencia suave, nunca bloquea: solo informa que faltan roles cubiertos segun los requisitos definidos. */
export function MissingRolesAlert({ coverage }: { coverage: SetlistItemCoverage }) {
  if (coverage.missingRoles.length === 0) return null;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-soft">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div>
        <p className="font-semibold">Roles sin cubrir</p>
        <ul className="mt-1 space-y-0.5">
          {coverage.missingRoles.map((missing) => (
            <li key={missing.role}>
              {missing.label || getRoleLabel(missing.role)}: {missing.assignedCount}/{missing.requiredCount}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
