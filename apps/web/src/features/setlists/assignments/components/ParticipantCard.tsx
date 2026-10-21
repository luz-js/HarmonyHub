import { AlertTriangle, Trash2 } from 'lucide-react';
import type { SetlistParticipant, SetlistParticipantStatus } from '../../../../shared/types';
import { primaryInstrumentLabel } from '../../../profile/utils/instrumentGroups';
import { PARTICIPANT_STATUS_LABELS } from '../utils/assignmentLabels';

export function ParticipantCard({
  participant,
  canManage,
  onChangeStatus,
  onRemove,
}: {
  participant: SetlistParticipant;
  canManage: boolean;
  onChangeStatus: (status: SetlistParticipantStatus) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#30333A] px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{participant.membership.user.name}</p>
        <p className="truncate text-xs text-muted">
          {primaryInstrumentLabel(participant.membership.user.instruments) || participant.membership.role} · {participant.assignmentsCount} asignacion(es)
          {participant.assignmentsCount > 0 ? ` · ${participant.readyCount}/${participant.assignmentsCount} listos` : ''}
        </p>
        {participant.status === 'DECLINED' && participant.assignmentsCount > 0 && (
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-warning-soft">
            <AlertTriangle className="h-3 w-3 shrink-0" /> Rechazó la invitación pero tiene asignaciones sin quitar
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {canManage ? (
          <select className="select h-8 text-xs" value={participant.status} onChange={(event) => onChangeStatus(event.target.value as SetlistParticipantStatus)}>
            {Object.entries(PARTICIPANT_STATUS_LABELS).map(([status, label]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
          </select>
        ) : (
          <span className="badge">{PARTICIPANT_STATUS_LABELS[participant.status]}</span>
        )}
        {canManage && (
          <button type="button" className="btn-ghost h-8 w-8 p-0 text-[#F7A39A]" aria-label="Quitar participante" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
