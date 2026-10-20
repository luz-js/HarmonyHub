import type { CueWarning, CueWarningCode, SetlistCue, SetlistCuePriority } from '../../../../shared/types';

export function isCriticalPriority(priority: SetlistCuePriority): boolean {
  return priority === 'CRITICAL';
}

type WarningItem = { id: string; isHidden: boolean; effective: { durationSec: number | null } };
type WarningParticipant = { id: string; status: string };

function normalizeCueTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Espejo de `buildCueWarnings` en `apps/api/src/setlists/cues/setlist-cue.utils.ts` — usado en el
 * Inspector para mostrar advertencias de un solo item sin esperar el agregado completo de `/production`.
 */
export function buildCueWarnings(cues: SetlistCue[], items: WarningItem[], participants: WarningParticipant[]): CueWarning[] {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const participantById = new Map(participants.map((participant) => [participant.id, participant]));
  const firstSeenByDuplicateKey = new Map<string, string>();
  const warnings: CueWarning[] = [];

  for (const cue of cues) {
    if (isCriticalPriority(cue.priority) && !cue.responsibleParticipant) {
      warnings.push({ cueId: cue.id, code: 'CRITICAL_WITHOUT_RESPONSIBLE' as CueWarningCode, message: 'Cue crítico sin responsable' });
    }
    if (cue.status === 'BLOCKED') {
      warnings.push({ cueId: cue.id, code: 'BLOCKED', message: 'Cue bloqueado' });
    }

    const item = cue.setlistItemId ? itemById.get(cue.setlistItemId) : undefined;
    if (item) {
      if (item.isHidden) warnings.push({ cueId: cue.id, code: 'HIDDEN_ITEM', message: 'Cue asociado a un item oculto' });
      if (cue.phase === 'DURING' && cue.offsetSec != null && item.effective.durationSec != null && cue.offsetSec > item.effective.durationSec) {
        warnings.push({ cueId: cue.id, code: 'OFFSET_BEYOND_DURATION', message: 'Este cue está programado después de la duración estimada del item' });
      }
    }

    if (cue.responsibleParticipant) {
      const participant = participantById.get(cue.responsibleParticipant.id);
      if (participant?.status === 'DECLINED') {
        warnings.push({ cueId: cue.id, code: 'DECLINED_RESPONSIBLE', message: 'El responsable de este cue rechazo su participacion en el setlist' });
      }
    }

    const duplicateKey = `${cue.setlistItemId ?? 'global'}:${cue.phase}:${cue.type}:${cue.offsetSec ?? 'null'}:${normalizeCueTitle(cue.title)}`;
    if (firstSeenByDuplicateKey.has(duplicateKey)) {
      warnings.push({ cueId: cue.id, code: 'PROBABLE_DUPLICATE', message: 'Posible cue duplicado' });
    } else {
      firstSeenByDuplicateKey.set(duplicateKey, cue.id);
    }
  }

  return warnings;
}
