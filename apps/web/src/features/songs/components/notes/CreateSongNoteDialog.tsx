import { FormEvent, useState } from 'react';
import { LoaderCircle, StickyNote } from 'lucide-react';
import type { SongNoteVisibility, SongVersion } from '../../../../shared/types';
import { OverlayDialog } from '../shared/OverlayDialog';
import { noteVisibilityLabels, visibilityOptionsForRole } from './note.utils';

const MAX_NOTE_CONTENT_LENGTH = 10000;

export type SongNoteDraft = {
  title: string;
  content: string;
  visibility: SongNoteVisibility;
  versionId: string;
  isPinned: boolean;
};

export function defaultSongNoteDraft(activeVersionId?: string | null): SongNoteDraft {
  return { title: '', content: '', visibility: 'ORGANIZATION', versionId: activeVersionId || '', isPinned: false };
}

/** Reutilizado tanto para crear como para editar una nota. */
export function SongNoteDialog({
  mode,
  role,
  versions,
  initial,
  submitting,
  error,
  onSubmit,
  onClose,
}: {
  mode: 'create' | 'edit';
  role?: string;
  versions: SongVersion[];
  initial: SongNoteDraft;
  submitting: boolean;
  error: string;
  onSubmit: (draft: SongNoteDraft) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<SongNoteDraft>(initial);
  const visibilityOptions = visibilityOptionsForRole(role);

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit(draft);
  }

  return (
    <OverlayDialog title={mode === 'create' ? 'Agregar nota' : 'Editar nota'} subtitle="Texto plano o Markdown simple. Máximo 10,000 caracteres." onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <label>
          <span className="label">Título (opcional)</span>
          <input className="input" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} maxLength={150} />
        </label>
        <label>
          <span className="label">Contenido</span>
          <textarea
            className="textarea min-h-[140px]"
            value={draft.content}
            onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value.slice(0, MAX_NOTE_CONTENT_LENGTH) }))}
            required
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="label">Visibilidad</span>
            <select className="select" value={draft.visibility} onChange={(event) => setDraft((current) => ({ ...current, visibility: event.target.value as SongNoteVisibility }))}>
              {visibilityOptions.map((visibility) => <option key={visibility} value={visibility}>{noteVisibilityLabels[visibility]}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Versión asociada</span>
            <select className="select" value={draft.versionId} onChange={(event) => setDraft((current) => ({ ...current, versionId: event.target.value }))}>
              <option value="">General de la canción</option>
              {versions.map((version) => <option key={version.id} value={version.id}>{version.name}</option>)}
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={draft.isPinned} onChange={(event) => setDraft((current) => ({ ...current, isPinned: event.target.checked }))} />
          Fijar esta nota
        </label>
        {error && <p className="text-sm text-red-200">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={submitting}>
            {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <StickyNote className="h-4 w-4" />}
            {submitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </OverlayDialog>
  );
}
