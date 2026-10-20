import { FormEvent, useState } from 'react';
import { LoaderCircle, Save } from 'lucide-react';
import { OverlayDialog } from '../../../shared/components/OverlayDialog';
import type { SetlistItem } from '../../../shared/types';
import { useUpdateSetlistItem } from '../hooks';

export function EditSetlistItemDialog({
  organizationId,
  setlistId,
  item,
  onClose,
}: {
  organizationId: string;
  setlistId: string;
  item: SetlistItem;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || '');
  const [estimatedSec, setEstimatedSec] = useState(item.estimatedSec != null ? String(item.estimatedSec) : '');
  const [keyOverride, setKeyOverride] = useState(item.keyOverride || '');
  const [bpmOverride, setBpmOverride] = useState(item.bpmOverride != null ? String(item.bpmOverride) : '');
  const [durationOverrideSec, setDurationOverrideSec] = useState(item.durationOverrideSec != null ? String(item.durationOverrideSec) : '');
  const [capo, setCapo] = useState(item.capo != null ? String(item.capo) : '');
  const [transitionNote, setTransitionNote] = useState(item.transitionNote || '');
  const [internalNote, setInternalNote] = useState(item.internalNote || '');
  const [isOptional, setIsOptional] = useState(item.isOptional);
  const [error, setError] = useState('');

  const updateMutation = useUpdateSetlistItem(organizationId, setlistId);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (item.type !== 'SONG' && !title.trim()) {
      setError('El título es requerido.');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        itemId: item.id,
        input: {
          title: item.type === 'SONG' ? undefined : title.trim(),
          description: description.trim() || null,
          estimatedSec: estimatedSec ? Number(estimatedSec) : null,
          keyOverride: item.type === 'SONG' ? keyOverride.trim() || null : undefined,
          bpmOverride: item.type === 'SONG' ? (bpmOverride ? Number(bpmOverride) : null) : undefined,
          durationOverrideSec: durationOverrideSec ? Number(durationOverrideSec) : null,
          capo: item.type === 'SONG' ? (capo ? Number(capo) : null) : undefined,
          transitionNote: transitionNote.trim() || null,
          internalNote: internalNote.trim() || null,
          isOptional,
        },
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar el item');
    }
  }

  return (
    <OverlayDialog title={`Editar "${item.title}"`} onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        {item.type !== 'SONG' && (
          <>
            <label>
              <span className="label">Título</span>
              <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required />
            </label>
            <label>
              <span className="label">Descripción</span>
              <input className="input" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} />
            </label>
            <label>
              <span className="label">Duración estimada (segundos)</span>
              <input className="input" type="number" min={0} value={estimatedSec} onChange={(event) => setEstimatedSec(event.target.value)} />
            </label>
          </>
        )}

        {item.type === 'SONG' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="label">Tonalidad (override)</span>
              <input className="input" value={keyOverride} onChange={(event) => setKeyOverride(event.target.value)} maxLength={10} placeholder={item.songVersion?.key || ''} />
            </label>
            <label>
              <span className="label">BPM (override)</span>
              <input className="input" type="number" min={20} max={300} value={bpmOverride} onChange={(event) => setBpmOverride(event.target.value)} placeholder={String(item.songVersion?.bpm || '')} />
            </label>
            <label>
              <span className="label">Duración en segundos (override)</span>
              <input className="input" type="number" min={0} value={durationOverrideSec} onChange={(event) => setDurationOverrideSec(event.target.value)} placeholder={String(item.songVersion?.durationSec || '')} />
            </label>
            <label>
              <span className="label">Capo (0-12)</span>
              <input className="input" type="number" min={0} max={12} value={capo} onChange={(event) => setCapo(event.target.value)} />
            </label>
          </div>
        )}

        <label>
          <span className="label">Nota de transición</span>
          <input className="input" value={transitionNote} onChange={(event) => setTransitionNote(event.target.value)} maxLength={2000} />
        </label>
        <label>
          <span className="label">Nota interna</span>
          <textarea className="input min-h-[70px]" value={internalNote} onChange={(event) => setInternalNote(event.target.value)} maxLength={5000} />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={isOptional} onChange={(event) => setIsOptional(event.target.checked)} />
          Marcar como opcional
        </label>

        {error && <p className="text-sm text-[#F7A39A]">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </OverlayDialog>
  );
}
