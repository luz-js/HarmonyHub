import type { SetlistCue } from '../../../../shared/types';
import { getCueTypeLabel } from '../../cues/utils/cueLabels';
import { isCriticalPriority } from '../../cues/utils/cueWarnings';

function cueReference(cue: SetlistCue): string | null {
  const sceneName = cue.metadata?.sceneName;
  if (typeof sceneName === 'string') return sceneName;
  const videoName = cue.metadata?.videoName;
  if (typeof videoName === 'string') return videoName;
  return null;
}

/**
 * Barra persistente (fusiona lo que el prompt sugiere como "CueOverlay" separado): siempre
 * visible, cue actual grande, proximo cue atenuado a la derecha. Cue critico en rojo suave,
 * nunca bloquea. Muestra referencia de video/luces (sceneName/videoName) cuando aplica, sin
 * reproducir ni controlar nada.
 */
export function LiveCueBar({ previousCue, currentCue, nextCue }: { previousCue: SetlistCue | null; currentCue: SetlistCue | null; nextCue: SetlistCue | null }) {
  if (!previousCue && !currentCue && !nextCue) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[#1b2c40] bg-[#0a1420] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      {previousCue && (
        <div className="shrink-0 opacity-40 sm:w-32">
          <p className="text-[10px] uppercase tracking-wide text-muted">Anterior</p>
          <p className="truncate text-xs text-muted">{getCueTypeLabel(previousCue.type)}</p>
        </div>
      )}

      {currentCue ? (
        <div className={`flex-1 rounded-md px-3 py-1.5 ${isCriticalPriority(currentCue.priority) ? 'bg-red-500/10' : ''}`}>
          <p className="text-[10px] uppercase tracking-wide text-muted">Cue</p>
          <p className="text-xl font-bold text-white">{getCueTypeLabel(currentCue.type)}</p>
          {currentCue.responsibleParticipant && (
            <p className="text-xs text-muted">Responsable: {currentCue.responsibleParticipant.membership.user.name}</p>
          )}
          {cueReference(currentCue) && <p className="text-xs text-faint">{cueReference(currentCue)}</p>}
        </div>
      ) : (
        <p className="flex-1 text-sm text-muted">Sin cues en este momento.</p>
      )}

      {nextCue && (
        <div className="shrink-0 text-right opacity-70 sm:w-40">
          <p className="text-[10px] uppercase tracking-wide text-muted">Proximo cue</p>
          <p className="truncate text-sm font-semibold text-white">{getCueTypeLabel(nextCue.type)}</p>
        </div>
      )}
    </div>
  );
}
