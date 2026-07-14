import { FormEvent, useState } from 'react';
import { LoaderCircle, RotateCcw } from 'lucide-react';
import type { SongVersionRevision } from '../../../../shared/types';
import { OverlayDialog } from '../shared/OverlayDialog';
import { formatHistoryDate, revisionSourceLabels } from './history.utils';

export function RestoreRevisionDialog({
  revision,
  submitting,
  error,
  onConfirm,
  onClose,
}: {
  revision: SongVersionRevision;
  submitting: boolean;
  error: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    onConfirm(reason);
  }

  return (
    <OverlayDialog title={`Restaurar revisión ${revision.revisionNumber}`} onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <p className="rounded-xl border border-amber-300/20 bg-amber-500/10 p-3 text-sm text-amber-100">
          Restaurar esta revisión reemplazará el contenido actual de la versión. El estado actual quedará guardado en el historial.
        </p>
        <div className="grid gap-2 text-sm text-muted">
          <p><span className="font-semibold text-white">Fecha:</span> {formatHistoryDate(revision.createdAt)}</p>
          <p><span className="font-semibold text-white">Autor:</span> {revision.createdBy?.name || 'Desconocido'}</p>
          <p><span className="font-semibold text-white">Origen:</span> {revisionSourceLabels[revision.source] || revision.source}</p>
          <p><span className="font-semibold text-white">Tonalidad:</span> {revision.key || '—'} · <span className="font-semibold text-white">BPM:</span> {revision.bpm ?? '—'}</p>
        </div>
        <label>
          <span className="label">Razón (opcional)</span>
          <input className="input" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} placeholder="Motivo de la restauración" />
        </label>
        {error && <p className="text-sm text-red-200">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={submitting}>
            {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            {submitting ? 'Restaurando...' : 'Restaurar revisión'}
          </button>
        </div>
      </form>
    </OverlayDialog>
  );
}
