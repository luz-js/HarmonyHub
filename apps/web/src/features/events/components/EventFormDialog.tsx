import { FormEvent, useState } from 'react';
import { LoaderCircle, Plus, Save } from 'lucide-react';
import { OverlayDialog } from '../../../shared/components/OverlayDialog';
import type { EventDraft } from '../utils';

export type EventSetlistOption = { id: string; name: string };

export function EventFormDialog({
  mode,
  initial,
  setlistOptions,
  submitting,
  error,
  onSubmit,
  onClose,
}: {
  mode: 'create' | 'edit';
  initial: EventDraft;
  setlistOptions: EventSetlistOption[];
  submitting: boolean;
  error: string;
  onSubmit: (draft: EventDraft) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<EventDraft>(initial);

  function update<K extends keyof EventDraft>(key: K, value: EventDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit(draft);
  }

  return (
    <OverlayDialog
      title={mode === 'create' ? 'Nuevo evento' : 'Editar evento'}
      subtitle="Programa un servicio, ensayo o concierto y vincula su setlist."
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={submit}>
        <label className="block">
          <span className="label">Nombre</span>
          <input
            className="input"
            value={draft.name}
            onChange={(event) => update('name', event.target.value)}
            placeholder="Culto dominical"
            maxLength={150}
            required
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="label">Fecha</span>
            <input className="input" type="date" value={draft.day} onChange={(event) => update('day', event.target.value)} required />
          </label>
          <label className="block">
            <span className="label">Inicio</span>
            <input className="input" type="time" value={draft.startTime} onChange={(event) => update('startTime', event.target.value)} required />
          </label>
          <label className="block">
            <span className="label">Fin (opcional)</span>
            <input className="input" type="time" value={draft.endTime} onChange={(event) => update('endTime', event.target.value)} />
          </label>
        </div>
        <label className="block">
          <span className="label">Lugar (opcional)</span>
          <input className="input" value={draft.location} onChange={(event) => update('location', event.target.value)} placeholder="Iglesia central" maxLength={200} />
        </label>
        <label className="block">
          <span className="label">Setlist (opcional)</span>
          <select className="select" value={draft.setlistId} onChange={(event) => update('setlistId', event.target.value)}>
            <option value="">Sin setlist</option>
            {setlistOptions.map((setlist) => (
              <option key={setlist.id} value={setlist.id}>
                {setlist.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Descripción (opcional)</span>
          <textarea
            className="textarea"
            value={draft.description}
            onChange={(event) => update('description', event.target.value)}
            placeholder="Indicaciones para el equipo, horario de prueba de sonido..."
            maxLength={2000}
          />
        </label>
        {error && <p className="text-sm text-[#F7A39A]">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : mode === 'create' ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {mode === 'create' ? 'Crear evento' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </OverlayDialog>
  );
}
