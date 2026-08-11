import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { CueWarning, SetlistCue, SetlistCuePhase, SetlistCuePriority } from '../../../../shared/types';
import {
  useDeleteSetlistCue,
  useDuplicateSetlistCue,
  useReorderSetlistCues,
  useUpdateSetlistCue,
  useUpdateSetlistCueStatus,
} from '../hooks/useSetlistCueMutations';
import { PHASE_LABELS } from '../utils/cueLabels';
import { CreateCueForm } from './CreateCueForm';
import { SetlistCueCard } from './SetlistCueCard';

export function CuePhaseSection({
  organizationId,
  setlistId,
  setlistItemId,
  phase,
  cues,
  warningsByCueId,
  canManage,
  currentUserId,
}: {
  organizationId: string;
  setlistId: string;
  setlistItemId: string | null;
  phase: SetlistCuePhase;
  cues: SetlistCue[];
  warningsByCueId: Map<string, CueWarning[]>;
  canManage: boolean;
  currentUserId?: string;
}) {
  const [adding, setAdding] = useState(false);
  const updateMutation = useUpdateSetlistCue(organizationId, setlistId);
  const statusMutation = useUpdateSetlistCueStatus(organizationId, setlistId);
  const deleteMutation = useDeleteSetlistCue(organizationId, setlistId);
  const duplicateMutation = useDuplicateSetlistCue(organizationId, setlistId);
  const reorderMutation = useReorderSetlistCues(organizationId, setlistId);

  const sorted = [...cues].sort((a, b) => a.sortOrder - b.sortOrder);

  function move(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;
    const ids = sorted.map((cue) => cue.id);
    [ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]];
    reorderMutation.mutate({ setlistItemId, phase, cueIds: ids });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="section-title">{PHASE_LABELS[phase]}</p>
        {canManage && !adding && (
          <button type="button" className="btn-ghost h-7 px-2 text-xs" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" /> Agregar cue
          </button>
        )}
      </div>

      <div className="mt-2 space-y-2">
        {sorted.map((cue, index) => {
          const isResponsible = cue.responsibleParticipant?.membership.user.id === currentUserId;
          return (
            <SetlistCueCard
              key={cue.id}
              organizationId={organizationId}
              setlistId={setlistId}
              cue={cue}
              canManage={canManage}
              canEditOwnStatus={canManage || isResponsible}
              warnings={warningsByCueId.get(cue.id) ?? []}
              isFirst={index === 0}
              isLast={index === sorted.length - 1}
              onMoveUp={() => move(index, 'up')}
              onMoveDown={() => move(index, 'down')}
              onChangeTitle={(title) => updateMutation.mutate({ cueId: cue.id, itemId: setlistItemId, input: { title } })}
              onChangeOffset={(offsetSec) => updateMutation.mutate({ cueId: cue.id, itemId: setlistItemId, input: { offsetSec } })}
              onChangePriority={(priority: SetlistCuePriority) => updateMutation.mutate({ cueId: cue.id, itemId: setlistItemId, input: { priority } })}
              onChangeResponsible={(participantId) =>
                updateMutation.mutate({ cueId: cue.id, itemId: setlistItemId, input: { responsibleParticipantId: participantId } })
              }
              onChangeStatus={(status) => statusMutation.mutate({ cueId: cue.id, itemId: setlistItemId, input: { status } })}
              onDuplicate={() => duplicateMutation.mutate({ cueId: cue.id, itemId: setlistItemId })}
              onDelete={() => deleteMutation.mutate({ cueId: cue.id, itemId: setlistItemId })}
            />
          );
        })}
        {sorted.length === 0 && !adding && <p className="text-xs text-muted">Sin cues en esta fase.</p>}
      </div>

      {adding && (
        <div className="mt-2">
          <CreateCueForm
            organizationId={organizationId}
            setlistId={setlistId}
            setlistItemId={setlistItemId}
            phase={phase}
            onDone={() => setAdding(false)}
          />
        </div>
      )}
    </div>
  );
}
