import { FormEvent, useState } from 'react';
import { LoaderCircle, Plus, Save } from 'lucide-react';
import { OverlayDialog } from '../../../shared/components/OverlayDialog';

export type SetlistTemplateOption = { id: string; name: string; description: string | null };
export type SetlistDraft = { name: string; description: string; sourceTemplateId?: string | null };

export function SetlistFormDialog({
  mode,
  initial,
  submitting,
  error,
  templateOptions,
  lockTemplateSelection,
  onSubmit,
  onClose,
}: {
  mode: 'create' | 'edit' | 'save-template';
  initial: SetlistDraft;
  submitting: boolean;
  error: string;
  templateOptions?: SetlistTemplateOption[];
  lockTemplateSelection?: boolean;
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
      title={mode === 'create' ? 'Nuevo setlist' : mode === 'save-template' ? 'Guardar como plantilla' : 'Editar setlist'}
      subtitle={
        mode === 'save-template'
          ? 'Guarda esta estructura para reutilizarla después en nuevos setlists.'
          : 'Organiza el orden de canciones y bloques para un servicio o ensayo.'
      }
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={submit}>
        {mode === 'create' && templateOptions && templateOptions.length > 0 && (
          <label>
            <span className="label">Partir desde plantilla (opcional)</span>
            <select
              className="select"
              value={draft.sourceTemplateId || ''}
              onChange={(event) => setDraft((current) => ({ ...current, sourceTemplateId: event.target.value || null }))}
              disabled={lockTemplateSelection}
            >
              <option value="">Setlist en blanco</option>
              {templateOptions.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            {draft.sourceTemplateId && (
              <p className="mt-1 text-xs text-faint">
                {templateOptions.find((template) => template.id === draft.sourceTemplateId)?.description || 'Se copiará la estructura base de esta plantilla.'}
              </p>
            )}
          </label>
        )}
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
        {error && <p className="text-sm text-[#F7A39A]">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={submitting}>
            {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : mode === 'create' ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {submitting ? 'Guardando...' : mode === 'create' ? 'Crear setlist' : mode === 'save-template' ? 'Guardar plantilla' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </OverlayDialog>
  );
}
