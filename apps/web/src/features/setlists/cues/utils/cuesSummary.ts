import type { SetlistCue } from '../../../../shared/types';

export type CuesSummary = {
  total: number;
  ready: number;
  criticalWithoutResponsible: number;
};

/** Resumen compacto por item, calculado una sola vez a partir de `/production` (nunca una query por card). */
export function buildCuesSummaryByItem(cues: SetlistCue[]): Map<string, CuesSummary> {
  const map = new Map<string, CuesSummary>();
  for (const cue of cues) {
    if (!cue.setlistItemId) continue;
    const entry = map.get(cue.setlistItemId) ?? { total: 0, ready: 0, criticalWithoutResponsible: 0 };
    entry.total += 1;
    if (cue.status === 'READY') entry.ready += 1;
    if (cue.priority === 'CRITICAL' && !cue.responsibleParticipant) entry.criticalWithoutResponsible += 1;
    map.set(cue.setlistItemId, entry);
  }
  return map;
}
