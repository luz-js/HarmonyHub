import { useEffect, useMemo, useReducer, useState } from 'react';
import type { SongContent, SongLine, SongSection, SongSectionType } from '../../types/song-content.types';
import { SongContentSchema } from '../../schemas';
import {
  contentToPlainChords,
  contentToPlainLyrics,
  createLine,
  createSection,
  deriveStructureJson,
  duplicateSection,
  legacyFieldsToSongContent,
  moveItem,
  normalizeSongContent,
  reorderLines,
  reorderSections,
} from '../../utils';
import { useSongVersion, useUpdateSongVersion } from '../../hooks';
import { getCurrentOrganizationId } from '../../../../shared/api/http';
import { SongEditorCanvas } from './SongEditorCanvas';
import { SongEditorToolbar } from './SongEditorToolbar';
import { SongPreview } from './SongPreview';
import type { SaveState } from './UnsavedChangesIndicator';
import { TransposeButton, TransposeDialog } from '../transposition';

type SongEditorAction =
  | { type: 'LOAD_CONTENT'; payload: SongContent }
  | { type: 'ADD_SECTION'; payload: SongSection }
  | { type: 'UPDATE_SECTION'; sectionId: string; patch: Partial<SongSection> }
  | { type: 'DELETE_SECTION'; sectionId: string }
  | { type: 'DUPLICATE_SECTION'; sectionId: string }
  | { type: 'MOVE_SECTION'; sectionId: string; direction: 'UP' | 'DOWN' }
  | { type: 'REORDER_SECTIONS'; sourceId: string; targetId: string }
  | { type: 'ADD_LINE'; sectionId: string; line: SongLine; afterLineId?: string }
  | { type: 'UPDATE_LINE'; sectionId: string; lineId: string; patch: Partial<SongLine> }
  | { type: 'DELETE_LINE'; sectionId: string; lineId: string }
  | { type: 'DUPLICATE_LINE'; sectionId: string; lineId: string }
  | { type: 'MOVE_LINE'; sectionId: string; lineId: string; direction: 'UP' | 'DOWN' }
  | { type: 'COLLAPSE_ALL'; collapsed: boolean }
  | { type: 'RESET'; payload: SongContent };

function reducer(state: SongContent, action: SongEditorAction): SongContent {
  switch (action.type) {
    case 'LOAD_CONTENT':
    case 'RESET':
      return normalizeSongContent(action.payload);
    case 'ADD_SECTION':
      return { version: 1, sections: reorderSections([...state.sections, action.payload]) };
    case 'UPDATE_SECTION':
      return { ...state, sections: state.sections.map((section) => section.id === action.sectionId ? { ...section, ...action.patch } : section) };
    case 'DELETE_SECTION':
      return { ...state, sections: reorderSections(state.sections.filter((section) => section.id !== action.sectionId)) };
    case 'DUPLICATE_SECTION': {
      const index = state.sections.findIndex((section) => section.id === action.sectionId);
      if (index < 0) return state;
      const sections = [...state.sections];
      sections.splice(index + 1, 0, duplicateSection(state.sections[index]));
      return { ...state, sections: reorderSections(sections) };
    }
    case 'MOVE_SECTION': {
      const index = state.sections.findIndex((section) => section.id === action.sectionId);
      return { ...state, sections: reorderSections(moveItem(state.sections, index, action.direction)) };
    }
    case 'REORDER_SECTIONS': {
      const sourceIndex = state.sections.findIndex((section) => section.id === action.sourceId);
      const targetIndex = state.sections.findIndex((section) => section.id === action.targetId);
      if (sourceIndex < 0 || targetIndex < 0) return state;
      const sections = [...state.sections];
      const [section] = sections.splice(sourceIndex, 1);
      sections.splice(targetIndex, 0, section);
      return { ...state, sections: reorderSections(sections) };
    }
    case 'ADD_LINE':
      return {
        ...state,
        sections: state.sections.map((section) => {
          if (section.id !== action.sectionId) return section;
          const lines = [...section.lines];
          const index = action.afterLineId ? lines.findIndex((line) => line.id === action.afterLineId) + 1 : lines.length;
          lines.splice(index < 0 ? lines.length : index, 0, action.line);
          return { ...section, lines: reorderLines(lines) };
        }),
      };
    case 'UPDATE_LINE':
      return { ...state, sections: state.sections.map((section) => section.id === action.sectionId ? { ...section, lines: section.lines.map((line) => line.id === action.lineId ? { ...line, ...action.patch } : line) } : section) };
    case 'DELETE_LINE':
      return { ...state, sections: state.sections.map((section) => section.id === action.sectionId ? { ...section, lines: reorderLines(section.lines.filter((line) => line.id !== action.lineId)) } : section) };
    case 'DUPLICATE_LINE':
      return {
        ...state,
        sections: state.sections.map((section) => {
          if (section.id !== action.sectionId) return section;
          const index = section.lines.findIndex((line) => line.id === action.lineId);
          if (index < 0) return section;
          const lines = [...section.lines];
          lines.splice(index + 1, 0, createLine({ chords: section.lines[index].chords, lyrics: section.lines[index].lyrics }));
          return { ...section, lines: reorderLines(lines) };
        }),
      };
    case 'MOVE_LINE':
      return { ...state, sections: state.sections.map((section) => section.id === action.sectionId ? { ...section, lines: reorderLines(moveItem(section.lines, section.lines.findIndex((line) => line.id === action.lineId), action.direction)) } : section) };
    case 'COLLAPSE_ALL':
      return { ...state, sections: state.sections.map((section) => ({ ...section, collapsed: action.collapsed })) };
    default:
      return state;
  }
}

function stable(value: unknown) {
  return JSON.stringify(value);
}

export interface SongEditorProps {
  songId: string;
  versionId: string;
  readOnly?: boolean;
  onSaved?: () => void;
}

export function SongEditor({ songId, versionId, readOnly, onSaved }: SongEditorProps) {
  const organizationId = getCurrentOrganizationId() || '';
  const versionQuery = useSongVersion(organizationId, songId, versionId);
  const updateMutation = useUpdateSongVersion(organizationId, songId);
  const [content, dispatch] = useReducer(reducer, { version: 1, sections: [] } satisfies SongContent);
  const [initialSnapshot, setInitialSnapshot] = useState('');
  const [showChords, setShowChords] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [fontSize, setFontSize] = useState(16);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [legacyNotice, setLegacyNotice] = useState(false);
  const [transposeOpen, setTransposeOpen] = useState(false);
  const [undoTransposeSnapshot, setUndoTransposeSnapshot] = useState<SongContent | null>(null);
  const [temporaryKey, setTemporaryKey] = useState('');

  const currentSnapshot = useMemo(() => stable(normalizeSongContent(content)), [content]);
  const isDirty = initialSnapshot !== '' && currentSnapshot !== initialSnapshot;

  useEffect(() => {
    if (!versionQuery.data) return;
    const parsed = SongContentSchema.safeParse(versionQuery.data.contentJson);
    const next = parsed.success ? normalizeSongContent(parsed.data) : legacyFieldsToSongContent(versionQuery.data.lyrics, versionQuery.data.chords);
    setLegacyNotice(!parsed.success);
    dispatch({ type: 'LOAD_CONTENT', payload: next });
    setInitialSnapshot(stable(next));
    setSaveState('idle');
  }, [versionQuery.data?.id]);

  useEffect(() => {
    if (saveState !== 'saving') setSaveState(isDirty ? 'dirty' : 'idle');
  }, [isDirty, saveState]);

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [isDirty]);

  useEffect(() => {
    function keyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void save();
      }
    }
    window.addEventListener('keydown', keyDown);
    return () => window.removeEventListener('keydown', keyDown);
  });

  async function save() {
    if (readOnly || !versionQuery.data) return;
    const normalized = normalizeSongContent(content);
    const parsed = SongContentSchema.safeParse(normalized);
    if (!parsed.success) {
      setSaveState('error');
      return;
    }
    setSaveState('saving');
    try {
      await updateMutation.mutateAsync({
        versionId,
        input: {
          contentJson: normalized,
          structureJson: deriveStructureJson(normalized) as unknown as Record<string, unknown>,
          lyrics: contentToPlainLyrics(normalized),
          chords: contentToPlainChords(normalized),
        },
      });
      setInitialSnapshot(stable(normalized));
      setLegacyNotice(false);
      setSaveState('saved');
      onSaved?.();
    } catch {
      setSaveState('error');
    }
  }

  if (versionQuery.isLoading) return <div className="panel animate-pulse p-5 text-muted">Cargando editor...</div>;
  if (versionQuery.error) return <div className="panel border-[#F27A6E]/30 p-5 text-[#F7A39A]">No se pudo cargar esta versión.</div>;
  if (!versionQuery.data) return <div className="panel p-5 text-muted">Selecciona una versión para editar.</div>;

  return (
    <section className="space-y-4">
      {legacyNotice && (
        <div className="rounded-md border border-warning/25 bg-warning-tint px-4 py-3 text-sm text-warning-soft">
          Esta versión usa un formato anterior. Al guardar, se convertirá al nuevo editor estructurado.
        </div>
      )}
      {readOnly && <div className="rounded-md border border-white/10 bg-[#141518] px-4 py-3 text-sm text-muted">Modo solo lectura. Tu rol actual no permite modificar esta versión.</div>}
      <SongEditorToolbar
        versionName={versionQuery.data.name}
        saveState={saveState}
        showPreview={showPreview}
        onShowPreviewChange={setShowPreview}
        showChords={showChords}
        onShowChordsChange={setShowChords}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        onAddSection={(type: SongSectionType) => dispatch({ type: 'ADD_SECTION', payload: createSection(type, undefined, content.sections) })}
        onSave={save}
        onCollapseAll={() => dispatch({ type: 'COLLAPSE_ALL', collapsed: true })}
        onExpandAll={() => dispatch({ type: 'COLLAPSE_ALL', collapsed: false })}
        readOnly={readOnly}
      />
      <div className="flex flex-wrap items-center gap-2">
        <TransposeButton onClick={() => setTransposeOpen(true)} />
        {temporaryKey && <span className="badge badge-primary">Vista local en {temporaryKey}</span>}
        {undoTransposeSnapshot && !readOnly && <button className="btn-ghost" onClick={() => {
          dispatch({ type: 'LOAD_CONTENT', payload: undoTransposeSnapshot });
          setUndoTransposeSnapshot(null);
          setTemporaryKey('');
        }}>Deshacer transposición</button>}
      </div>
      <div className={showPreview ? 'grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]' : 'grid gap-5'}>
        <SongEditorCanvas
          content={content}
          showChords={showChords}
          readOnly={readOnly}
          songId={songId}
          versionId={versionId}
          onAddSection={(type) => dispatch({ type: 'ADD_SECTION', payload: createSection(type, undefined, content.sections) })}
          onUpdateSection={(sectionId, patch) => dispatch({ type: 'UPDATE_SECTION', sectionId, patch })}
          onDeleteSection={(sectionId) => {
            const section = content.sections.find((item) => item.id === sectionId);
            const hasContent = section?.lines.some((line) => line.chords.trim() || line.lyrics.trim()) || section?.notes?.trim();
            if (!hasContent || window.confirm('Esta sección tiene contenido. ¿Deseas borrarla?')) dispatch({ type: 'DELETE_SECTION', sectionId });
          }}
          onDuplicateSection={(sectionId) => dispatch({ type: 'DUPLICATE_SECTION', sectionId })}
          onMoveSection={(sectionId, direction) => dispatch({ type: 'MOVE_SECTION', sectionId, direction })}
          onDropSection={(sourceId, targetId) => dispatch({ type: 'REORDER_SECTIONS', sourceId, targetId })}
          onToggleSection={(sectionId) => {
            const section = content.sections.find((item) => item.id === sectionId);
            dispatch({ type: 'UPDATE_SECTION', sectionId, patch: { collapsed: !section?.collapsed } });
          }}
          onUpdateLine={(sectionId, lineId, patch) => dispatch({ type: 'UPDATE_LINE', sectionId, lineId, patch })}
          onAddLine={(sectionId, afterLineId) => dispatch({ type: 'ADD_LINE', sectionId, afterLineId, line: createLine() })}
          onDeleteLine={(sectionId, lineId) => dispatch({ type: 'DELETE_LINE', sectionId, lineId })}
          onDuplicateLine={(sectionId, lineId) => dispatch({ type: 'DUPLICATE_LINE', sectionId, lineId })}
          onMoveLine={(sectionId, lineId, direction) => dispatch({ type: 'MOVE_LINE', sectionId, lineId, direction })}
        />
        {showPreview && (
          <aside className="panel h-fit p-5 xl:sticky xl:top-24">
            <h3 className="mb-4 text-base font-bold text-white">Vista previa</h3>
            <SongPreview content={content} showChords={showChords} fontSize={fontSize} />
          </aside>
        )}
      </div>
      <TransposeDialog
        open={transposeOpen}
        onClose={() => setTransposeOpen(false)}
        songId={songId}
        version={versionQuery.data}
        content={content}
        readOnly={readOnly}
        onTemporary={(key, nextContent) => {
          if (isDirty && !window.confirm('Tienes cambios sin guardar. La transposición se aplicará al contenido actualmente visible.')) return;
          setUndoTransposeSnapshot(content);
          setTemporaryKey(key);
          dispatch({ type: 'LOAD_CONTENT', payload: nextContent });
        }}
        onResetTemporary={() => {
          if (undoTransposeSnapshot) dispatch({ type: 'LOAD_CONTENT', payload: undoTransposeSnapshot });
          setUndoTransposeSnapshot(null);
          setTemporaryKey('');
        }}
        onSaved={onSaved}
      />
    </section>
  );
}
