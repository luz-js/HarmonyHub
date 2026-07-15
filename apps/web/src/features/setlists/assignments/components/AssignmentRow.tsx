import { useState } from 'react';
import { Star, Trash2 } from 'lucide-react';
import type { AssignmentPreparationStatus, SetlistAssignment, SetlistItemType } from '../../../../shared/types';
import { getRoleLabel } from '../utils/assignmentLabels';
import { MusicalRolePicker } from './MusicalRolePicker';
import { PreparationStatusSelect } from './PreparationStatusSelect';

export function AssignmentRow({
  assignment,
  itemType,
  canManage,
  canEditPreparation,
  onChangeRole,
  onToggleIsPrimary,
  onChangeInstrument,
  onChangePreparation,
  onDelete,
}: {
  assignment: SetlistAssignment;
  itemType: SetlistItemType;
  canManage: boolean;
  canEditPreparation: boolean;
  onChangeRole: (role: SetlistAssignment['role']) => void;
  onToggleIsPrimary: (isPrimary: boolean) => void;
  onChangeInstrument: (instrument: string) => void;
  onChangePreparation: (status: AssignmentPreparationStatus) => void;
  onDelete: () => void;
}) {
  const [instrument, setInstrument] = useState(assignment.instrument || '');

  return (
    <div className="rounded-lg border border-[#1b2c40] p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{assignment.participant.membership.user.name}</p>
          {canManage ? (
            <MusicalRolePicker itemType={itemType} value={assignment.role} onChange={onChangeRole} />
          ) : (
            <p className="text-xs text-muted">{getRoleLabel(assignment.role)}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canManage && (
            <button
              type="button"
              className={assignment.isPrimary ? 'btn-primary h-7 w-7 p-0' : 'btn-ghost h-7 w-7 p-0'}
              aria-label={assignment.isPrimary ? 'Quitar como principal' : 'Marcar como principal'}
              aria-pressed={assignment.isPrimary}
              onClick={() => onToggleIsPrimary(!assignment.isPrimary)}
            >
              <Star className="h-3.5 w-3.5" />
            </button>
          )}
          {canManage && (
            <button type="button" className="btn-ghost h-7 w-7 p-0 text-red-300" aria-label="Quitar asignacion" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {canManage ? (
          <label className="block">
            <span className="label">Instrumento / detalle</span>
            <input
              className="input"
              value={instrument}
              onChange={(event) => setInstrument(event.target.value)}
              onBlur={() => onChangeInstrument(instrument)}
            />
          </label>
        ) : (
          assignment.instrument && <p className="text-xs text-muted">{assignment.instrument}</p>
        )}

        <div>
          <span className="label">Preparacion</span>
          <PreparationStatusSelect value={assignment.preparationStatus} onChange={onChangePreparation} disabled={!canEditPreparation} />
        </div>
      </div>
    </div>
  );
}
