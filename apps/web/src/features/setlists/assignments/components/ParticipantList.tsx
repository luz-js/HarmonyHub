import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { SetlistParticipant } from '../../../../shared/types';
import { useRemoveSetlistParticipant, useUpdateSetlistParticipant } from '../hooks/useSetlistParticipantMutations';
import { AddParticipantDialog } from './AddParticipantDialog';
import { ParticipantCard } from './ParticipantCard';

export function ParticipantList({
  organizationId,
  setlistId,
  participants,
  canManage,
}: {
  organizationId: string;
  setlistId: string;
  participants: SetlistParticipant[];
  canManage: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const updateMutation = useUpdateSetlistParticipant(organizationId, setlistId);
  const removeMutation = useRemoveSetlistParticipant(organizationId, setlistId);

  function handleRemove(participant: SetlistParticipant) {
    const message =
      participant.assignmentsCount > 0
        ? `${participant.membership.user.name} tiene ${participant.assignmentsCount} asignacion(es). Quitarlo del equipo tambien eliminara esas asignaciones. Continuar?`
        : `Quitar a ${participant.membership.user.name} del equipo?`;
    if (!window.confirm(message)) return;
    removeMutation.mutate({ participantId: participant.id, removeAssignments: participant.assignmentsCount > 0 });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="label">Participantes ({participants.length})</span>
        {canManage && (
          <button type="button" className="btn-ghost h-8 px-3 text-xs" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Agregar
          </button>
        )}
      </div>

      <div className="space-y-2">
        {participants.map((participant) => (
          <ParticipantCard
            key={participant.id}
            participant={participant}
            canManage={canManage}
            onChangeStatus={(status) => updateMutation.mutate({ participantId: participant.id, input: { status } })}
            onRemove={() => handleRemove(participant)}
          />
        ))}
        {participants.length === 0 && <p className="text-xs text-muted">Todavia no hay participantes en este setlist.</p>}
      </div>

      {addOpen && (
        <AddParticipantDialog
          organizationId={organizationId}
          setlistId={setlistId}
          excludeMembershipIds={participants.map((participant) => participant.membership.id)}
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  );
}
