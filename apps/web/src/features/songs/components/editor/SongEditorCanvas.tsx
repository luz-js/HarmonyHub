import type { SongContent, SongLine, SongSection, SongSectionType } from '../../types/song-content.types';
import { SongSectionCard } from './SongSectionCard';

export function SongEditorCanvas({
  content,
  showChords,
  readOnly,
  songId,
  versionId,
  onAddSection,
  onUpdateSection,
  onDeleteSection,
  onDuplicateSection,
  onMoveSection,
  onDropSection,
  onToggleSection,
  onUpdateLine,
  onAddLine,
  onDeleteLine,
  onDuplicateLine,
  onMoveLine,
}: {
  content: SongContent;
  showChords: boolean;
  readOnly?: boolean;
  songId?: string;
  versionId?: string;
  onAddSection: (type: SongSectionType) => void;
  onUpdateSection: (sectionId: string, patch: Partial<SongSection>) => void;
  onDeleteSection: (sectionId: string) => void;
  onDuplicateSection: (sectionId: string) => void;
  onMoveSection: (sectionId: string, direction: 'UP' | 'DOWN') => void;
  onDropSection: (sourceId: string, targetId: string) => void;
  onToggleSection: (sectionId: string) => void;
  onUpdateLine: (sectionId: string, lineId: string, patch: Partial<SongLine>) => void;
  onAddLine: (sectionId: string, afterLineId?: string) => void;
  onDeleteLine: (sectionId: string, lineId: string) => void;
  onDuplicateLine: (sectionId: string, lineId: string) => void;
  onMoveLine: (sectionId: string, lineId: string, direction: 'UP' | 'DOWN') => void;
}) {
  let draggedSectionId = '';

  if (!content.sections.length) {
    return (
      <div className="rounded-lg border border-dashed border-white/10 bg-[#141518] p-8 text-center">
        <h3 className="text-lg font-bold text-white">Esta versión todavía no tiene una estructura.</h3>
        <p className="mt-2 text-sm text-muted">Agrega la primera sección para construir letra y acordes visualmente.</p>
        {!readOnly && <button type="button" className="btn-primary mt-4" onClick={() => onAddSection('VERSE')}>Agregar sección</button>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {content.sections.map((section) => (
        <SongSectionCard
          key={section.id}
          section={section}
          showChords={showChords}
          readOnly={readOnly}
          songId={songId}
          versionId={versionId}
          onChange={(patch) => onUpdateSection(section.id, patch)}
          onLineChange={(lineId, patch) => onUpdateLine(section.id, lineId, patch)}
          onAddLine={(afterLineId) => onAddLine(section.id, afterLineId)}
          onDeleteLine={(lineId) => onDeleteLine(section.id, lineId)}
          onDuplicateLine={(lineId) => onDuplicateLine(section.id, lineId)}
          onMoveLine={(lineId, direction) => onMoveLine(section.id, lineId, direction)}
          onDuplicate={() => onDuplicateSection(section.id)}
          onDelete={() => onDeleteSection(section.id)}
          onMove={(direction) => onMoveSection(section.id, direction)}
          onToggle={() => onToggleSection(section.id)}
          onDragStart={() => { draggedSectionId = section.id; }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => draggedSectionId && draggedSectionId !== section.id && onDropSection(draggedSectionId, section.id)}
        />
      ))}
    </div>
  );
}
