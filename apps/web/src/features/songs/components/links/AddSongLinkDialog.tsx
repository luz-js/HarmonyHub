import { FormEvent, useMemo, useState } from 'react';
import { Link2, LoaderCircle } from 'lucide-react';
import type { SongVersion } from '../../../../shared/types';
import { OverlayDialog } from '../shared/OverlayDialog';
import { detectProviderPreview, linkProviderLabels } from './link.utils';

export type SongLinkDraft = {
  url: string;
  title: string;
  versionId: string;
  isPrimary: boolean;
};

/**
 * Dialogo reutilizado tanto para agregar como para editar un SongLink.
 * La deteccion de proveedor mostrada aqui es solo una preview en cliente;
 * el backend siempre recalcula el proveedor real a partir de la URL.
 */
export function SongLinkDialog({
  mode,
  versions,
  initial,
  submitting,
  error,
  onSubmit,
  onClose,
}: {
  mode: 'create' | 'edit';
  versions: SongVersion[];
  initial: SongLinkDraft;
  submitting: boolean;
  error: string;
  onSubmit: (draft: SongLinkDraft) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<SongLinkDraft>(initial);
  const previewProvider = useMemo(() => (draft.url ? detectProviderPreview(draft.url) : null), [draft.url]);

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit(draft);
  }

  return (
    <OverlayDialog
      title={mode === 'create' ? 'Agregar referencia externa' : 'Editar referencia'}
      subtitle="Videos, canciones en streaming, tutoriales, ensayos o presentaciones en vivo."
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={submit}>
        <label>
          <span className="label">URL</span>
          <input
            className="input"
            value={draft.url}
            onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))}
            placeholder="https://..."
            required
          />
          {previewProvider && (
            <p className="mt-1.5 text-xs text-muted">Proveedor detectado: <span className="text-[#8FB4FF]">{linkProviderLabels[previewProvider]}</span></p>
          )}
        </label>
        <label>
          <span className="label">Título</span>
          <input
            className="input"
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder="Video oficial, versión acústica, tutorial de guitarra..."
            maxLength={160}
            required
          />
        </label>
        <label>
          <span className="label">Versión asociada</span>
          <select className="select" value={draft.versionId} onChange={(event) => setDraft((current) => ({ ...current, versionId: event.target.value }))}>
            <option value="">General de la canción</option>
            {versions.map((version) => <option key={version.id} value={version.id}>{version.name}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={draft.isPrimary} onChange={(event) => setDraft((current) => ({ ...current, isPrimary: event.target.checked }))} />
          Marcar como referencia principal dentro de este contexto
        </label>
        {error && <p className="text-sm text-[#F7A39A]">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={submitting}>
            {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            {submitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </OverlayDialog>
  );
}
