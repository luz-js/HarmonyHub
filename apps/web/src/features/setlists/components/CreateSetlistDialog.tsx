import { FormEvent, useState } from 'react';
import { LoaderCircle, Plus, Save } from 'lucide-react';
import { OverlayDialog } from '../../../shared/components/OverlayDialog';

export type SetlistDraft = { name: string; description: string };

export function SetlistFormDialog({
  mode,
  initial,
  submitting,
  error,
  onSubmit,
  onClose,
}: {
  mode: 'create' | 'edit';
  initial: SetlistDraft;
  submitting: boolean;
  error: string;
  onSubmit: (draft: SetlistDraft) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<SetlistDraft>(initial);

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit(draft);
  }

  return (
    <OverlayDialog
      title={mode === 'create' ? 'Nuevo setlist' : 'Editar setlist'}
      subtitle="Organiza el orden de canciones y bloques para un servicio o ensayo."
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={submit}>
        <label>
          <span className="label">Nombre</span>
          <input
            className="input"
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            placeholder="Culto domingo 20 julio"
            maxLength={150}
            required
          />
        </label>
        <label>
          <span className="label">Descripción (opcional)</span>
          <textarea
            className="input min-h-[90px]"
            value={draft.description}
            onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            maxLength={2000}
            placeholder="Notas generales sobre este setlist"
          />
        </label>
        {error && <p className="text-sm text-red-200">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={submitting}>
            {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : mode === 'create' ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {submitting ? 'Guardando...' : mode === 'create' ? 'Crear setlist' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </OverlayDialog>
  );
}
