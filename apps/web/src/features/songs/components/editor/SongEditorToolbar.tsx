import { ChevronDown, ChevronRight, Save } from 'lucide-react';
import type { SongSectionType } from '../../types/song-content.types';
import { AddSectionMenu } from './AddSectionMenu';
import { EditorViewOptions } from './EditorViewOptions';
import { UnsavedChangesIndicator, type SaveState } from './UnsavedChangesIndicator';

export function SongEditorToolbar({
  versionName,
  saveState,
  showPreview,
  onShowPreviewChange,
  showChords,
  onShowChordsChange,
  fontSize,
  onFontSizeChange,
  onAddSection,
  onSave,
  onCollapseAll,
  onExpandAll,
  readOnly,
}: {
  versionName: string;
  saveState: SaveState;
  showPreview: boolean;
  onShowPreviewChange: (value: boolean) => void;
  showChords: boolean;
  onShowChordsChange: (value: boolean) => void;
  fontSize: number;
  onFontSizeChange: (value: number) => void;
  onAddSection: (type: SongSectionType) => void;
  onSave: () => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  readOnly?: boolean;
}) {
  return (
    <div className="sticky top-0 z-10 rounded-lg border border-[#30333A] bg-[#1A1B1F]/95 p-4 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <p className="text-xs font-semibold uppercase text-muted">Versión activa</p>
          <h2 className="text-lg font-bold text-white">{versionName}</h2>
        </div>
        <UnsavedChangesIndicator state={saveState} />
        <EditorViewOptions showChords={showChords} onShowChordsChange={onShowChordsChange} fontSize={fontSize} onFontSizeChange={onFontSizeChange} />
        <button type="button" className="btn-ghost" onClick={() => onShowPreviewChange(!showPreview)}>{showPreview ? 'Ocultar preview' : 'Ver preview'}</button>
        <button type="button" className="btn-ghost" aria-label="Expandir secciones" onClick={onExpandAll}><ChevronDown className="h-4 w-4" /></button>
        <button type="button" className="btn-ghost" aria-label="Colapsar secciones" onClick={onCollapseAll}><ChevronRight className="h-4 w-4" /></button>
        {!readOnly && <button type="button" className="btn-primary" onClick={onSave} disabled={saveState === 'saving'}><Save className="h-4 w-4" /> Guardar</button>}
      </div>
      {!readOnly && (
        <div className="mt-3 border-t border-white/10 pt-3">
          <AddSectionMenu compact onAdd={onAddSection} />
        </div>
      )}
    </div>
  );
}
