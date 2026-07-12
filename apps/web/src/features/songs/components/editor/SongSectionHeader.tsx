import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Copy, GripVertical, Trash2 } from 'lucide-react';
import type { SongSection, SongSectionType } from '../../types/song-content.types';
import { sectionTypeLabels } from '../../utils';
import { SectionTypeBadge } from './SectionTypeBadge';

export function SongSectionHeader({
  section,
  readOnly,
  onChange,
  onDuplicate,
  onDelete,
  onMove,
  onToggle,
}: {
  section: SongSection;
  readOnly?: boolean;
  onChange: (patch: Partial<SongSection>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (direction: 'UP' | 'DOWN') => void;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="cursor-grab rounded-md border border-white/10 bg-[#071118] p-2 text-muted" draggable aria-label="Arrastrar seccion">
        <GripVertical className="h-4 w-4" />
      </span>
      <button type="button" className="icon-button" aria-label="Colapsar seccion" onClick={onToggle}>
        {section.collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      <SectionTypeBadge type={section.type} />
      {!readOnly ? (
        <>
          <select className="input h-10 w-[150px]" value={section.type} onChange={(event) => onChange({ type: event.target.value as SongSectionType })}>
            {Object.entries(sectionTypeLabels).map(([type, label]) => <option key={type} value={type}>{label}</option>)}
          </select>
          <input className="input h-10 min-w-[180px] flex-1 font-bold text-white" value={section.name} onChange={(event) => onChange({ name: event.target.value })} aria-label="Nombre de seccion" />
        </>
      ) : (
        <h3 className="text-base font-bold text-white">{section.name}</h3>
      )}
      {!readOnly && (
        <div className="ml-auto flex flex-wrap gap-1">
          <button type="button" className="icon-button" aria-label="Mover seccion arriba" onClick={() => onMove('UP')}><ArrowUp className="h-4 w-4" /></button>
          <button type="button" className="icon-button" aria-label="Mover seccion abajo" onClick={() => onMove('DOWN')}><ArrowDown className="h-4 w-4" /></button>
          <button type="button" className="icon-button" aria-label="Duplicar seccion" onClick={onDuplicate}><Copy className="h-4 w-4" /></button>
          <button type="button" className="icon-button text-red-200" aria-label="Borrar seccion" onClick={onDelete}><Trash2 className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}
