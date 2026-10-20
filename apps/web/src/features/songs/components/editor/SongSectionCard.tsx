import type { SongLine, SongSection } from '../../types/song-content.types';
import { SongLineEditor } from './SongLineEditor';
import { SongSectionHeader } from './SongSectionHeader';

export function SongSectionCard({
  section,
  showChords,
  readOnly,
  songId,
  versionId,
  onChange,
  onLineChange,
  onAddLine,
  onDeleteLine,
  onDuplicateLine,
  onMoveLine,
  onDuplicate,
  onDelete,
  onMove,
  onToggle,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  section: SongSection;
  showChords: boolean;
  readOnly?: boolean;
  songId?: string;
  versionId?: string;
  onChange: (patch: Partial<SongSection>) => void;
  onLineChange: (lineId: string, patch: Partial<SongLine>) => void;
  onAddLine: (afterLineId?: string) => void;
  onDeleteLine: (lineId: string) => void;
  onDuplicateLine: (lineId: string) => void;
  onMoveLine: (lineId: string, direction: 'UP' | 'DOWN') => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (direction: 'UP' | 'DOWN') => void;
  onToggle: () => void;
  onDragStart: () => void;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: () => void;
}) {
  return (
    <article className="rounded-lg border border-[#30333A] bg-[#141518] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.18)]" draggable={!readOnly} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop}>
      <SongSectionHeader section={section} readOnly={readOnly} songId={songId} versionId={versionId} onChange={onChange} onDuplicate={onDuplicate} onDelete={onDelete} onMove={onMove} onToggle={onToggle} />
      {!section.collapsed && (
        <div className="mt-4 space-y-3">
          {!readOnly && (
            <textarea className="input min-h-[48px] resize-y text-sm" value={section.notes || ''} onChange={(event) => onChange({ notes: event.target.value })} placeholder="Notas de sección" aria-label="Notas de sección" />
          )}
          {section.lines.length === 0 && <p className="rounded-md border border-dashed border-white/10 p-4 text-sm text-muted">Sección instrumental sin líneas. Puedes agregar una línea si necesitas letra o acordes detallados.</p>}
          {section.lines.map((line) => (
            <SongLineEditor
              key={line.id}
              line={line}
              showChords={showChords}
              readOnly={readOnly}
              onChange={(patch) => onLineChange(line.id, patch)}
              onDelete={() => onDeleteLine(line.id)}
              onDuplicate={() => onDuplicateLine(line.id)}
              onMove={(direction) => onMoveLine(line.id, direction)}
              onInsertAfter={() => onAddLine(line.id)}
            />
          ))}
          {!readOnly && (
            <button type="button" className="btn-ghost" onClick={() => onAddLine()}>
              + Agregar linea
            </button>
          )}
        </div>
      )}
    </article>
  );
}
