import { AlertTriangle } from 'lucide-react';
import type { SetlistAssignment, SetlistParticipant } from '../../../../shared/types';
import { computeParticipantWorkload, isOverloaded } from '../utils/assignmentConflicts';

export function ParticipantWorkloadView({
  participants,
  assignments,
  totalItems,
}: {
  participants: SetlistParticipant[];
  assignments: SetlistAssignment[];
  totalItems: number;
}) {
  const workloadByParticipant = new Map(computeParticipantWorkload(assignments, totalItems).map((entry) => [entry.participantId, entry]));

  return (
    <div className="space-y-2">
      {participants.map((participant) => {
        const workload = workloadByParticipant.get(participant.id);
        const overloaded = workload ? isOverloaded(workload) : false;
        return (
          <div key={participant.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#1b2c40] px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{participant.membership.user.name}</p>
              <p className="text-xs text-muted">
                {workload?.itemsCount ?? 0} de {totalItems} items · {participant.readyCount}/{participant.assignmentsCount} listos
              </p>
            </div>
            {overloaded && (
              <span className="badge badge-warning shrink-0" title="Este musico esta asignado en la mayoria de los items">
                <AlertTriangle className="h-3 w-3" /> Carga alta
              </span>
            )}
          </div>
        );
      })}
      {participants.length === 0 && <p className="text-xs text-muted">Todavia no hay participantes en este setlist.</p>}
    </div>
  );
}
