import { useState } from 'react';
import { Copy } from 'lucide-react';
import type { SetlistItem } from '../../../../shared/types';
import { useSetlistParticipants } from '../../assignments/hooks/useSetlistParticipants';
import { useSetlistItems } from '../../hooks';
import { useSetlistItemCues } from '../hooks/useSetlistItemCues';
import { buildCueWarnings } from '../utils/cueWarnings';
import { CopyCuesDialog } from './CopyCuesDialog';
import { CuePhaseSection } from './CuePhaseSection';

const PHASES = ['BEFORE', 'DURING', 'AFTER'] as const;

export function ItemCuesSection({
  organizationId,
  setlistId,
  item,
  canManage,
  currentUserId,
}: {
  organizationId: string;
  setlistId: string;
  item: SetlistItem;
  canManage: boolean;
  currentUserId?: string;
}) {
  const [copyOpen, setCopyOpen] = useState(false);
  const cuesQuery = useSetlistItemCues(organizationId, setlistId, item.id);
  const participantsQuery = useSetlistParticipants(organizationId, setlistId);
  const itemsQuery = useSetlistItems(organizationId, setlistId);

  const cues = cuesQuery.data ?? [];
  const participants = participantsQuery.data ?? [];
  const otherItems = (itemsQuery.data ?? []).filter((candidate) => candidate.id !== item.id);

  const warnings = buildCueWarnings(
    cues,
    [{ id: item.id, isHidden: item.isHidden, effective: { durationSec: item.effective.durationSec } }],
    participants.map((participant) => ({ id: participant.id, status: participant.status })),
  );
  const warningsByCueId = new Map<string, typeof warnings>();
  for (const warning of warnings) {
    const list = warningsByCueId.get(warning.cueId) ?? [];
    list.push(warning);
    warningsByCueId.set(warning.cueId, list);
  }

  return (
    <div className="space-y-4">
      {canManage && otherItems.length > 0 && (
        <div className="flex justify-end">
          <button type="button" className="btn-ghost h-7 px-2 text-xs" onClick={() => setCopyOpen(true)}>
            <Copy className="h-3.5 w-3.5" /> Copiar cues de otra canción
          </button>
        </div>
      )}

      {PHASES.map((phase) => (
        <CuePhaseSection
          key={phase}
          organizationId={organizationId}
          setlistId={setlistId}
          setlistItemId={item.id}
          phase={phase}
          cues={cues.filter((cue) => cue.phase === phase)}
          warningsByCueId={warningsByCueId}
          canManage={canManage}
          currentUserId={currentUserId}
        />
      ))}

      {copyOpen && (
        <CopyCuesDialog organizationId={organizationId} setlistId={setlistId} targetItem={item} otherItems={otherItems} onClose={() => setCopyOpen(false)} />
      )}
    </div>
  );
}
