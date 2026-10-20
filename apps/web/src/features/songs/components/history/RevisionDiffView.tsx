import type { SongRevisionDiffResult } from '../../../../shared/types';
import { diffFieldLabel, hasDiffChanges } from './history.utils';

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

export function RevisionDiffView({ result }: { result: SongRevisionDiffResult }) {
  const { diff } = result;

  if (!hasDiffChanges(diff)) {
    return <p className="text-sm text-muted">No hay cambios entre estas revisiones.</p>;
  }

  return (
    <div className="space-y-4">
      {diff.scalarChanges.length > 0 && (
        <div className="space-y-2">
          {diff.scalarChanges.map((change) => (
            <p key={change.field} className="text-sm text-white/90">
              <span className="font-semibold">{diffFieldLabel(change.field)}:</span> {formatValue(change.before)} → {formatValue(change.after)}
            </p>
          ))}
        </div>
      )}

      {(diff.sectionsAdded.length > 0 || diff.sectionsRemoved.length > 0) && (
        <p className="text-sm text-white/90">
          <span className="font-semibold">Secciones:</span>{' '}
          {diff.sectionsAdded.length > 0 && `${diff.sectionsAdded.length} agregada(s)`}
          {diff.sectionsAdded.length > 0 && diff.sectionsRemoved.length > 0 && ' · '}
          {diff.sectionsRemoved.length > 0 && `${diff.sectionsRemoved.length} eliminada(s)`}
        </p>
      )}

      {diff.sectionsChanged.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-white/90">Secciones modificadas</p>
          {diff.sectionsChanged.map((section) => (
            <div key={section.sectionId} className="rounded-xl border border-[#30333A] bg-[#1C2436] p-3 text-sm text-muted">
              <span className="font-semibold text-white">{section.sectionName}</span>
              {section.linesAdded > 0 && <span> · {section.linesAdded} línea(s) agregada(s)</span>}
              {section.linesRemoved > 0 && <span> · {section.linesRemoved} línea(s) eliminada(s)</span>}
              {section.lyricsChanged && <span> · letra modificada</span>}
              {section.chordsChanged && <span> · acordes modificados</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
