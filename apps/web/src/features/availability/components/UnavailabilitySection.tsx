import { FormEvent, useState } from 'react';
import { CalendarX2, Trash2 } from 'lucide-react';
import type { Unavailability } from '../../../shared/types';
import { useAddUnavailability, useDeleteUnavailability, useMyUnavailability } from '../hooks';
import { formatDayRange, splitByToday, todayDay } from '../utils/availability.utils';

/** "Mi perfil" > No disponible: fechas en que la persona no puede tocar, en todas sus organizaciones. */
export function UnavailabilitySection() {
  const list = useMyUnavailability();
  const addMutation = useAddUnavailability();
  const deleteMutation = useDeleteUnavailability();
  const today = todayDay();
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const { upcoming, past } = splitByToday(list.data ?? [], today);

  function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!startsOn) {
      setError('Elige desde qué día no estás disponible.');
      return;
    }
    const end = endsOn || startsOn;
    if (end < startsOn) {
      setError('La fecha "hasta" no puede ser anterior a la fecha "desde".');
      return;
    }
    addMutation.mutate(
      { startsOn, endsOn: end, note: note.trim() || null },
      {
        onSuccess: () => {
          setStartsOn('');
          setEndsOn('');
          setNote('');
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'No se pudo guardar la fecha'),
      },
    );
  }

  function remove(id: string) {
    setError('');
    deleteMutation.mutate(id, { onError: (err) => setError(err instanceof Error ? err.message : 'No se pudo borrar la fecha') });
  }

  return (
    <section className="panel space-y-4 p-5" aria-labelledby="unavailability-title">
      <div>
        <h2 id="unavailability-title" className="section-title">No disponible</h2>
        <p className="mt-1 text-sm text-muted">
          Marca los días en que no puedes tocar. Quienes arman los equipos verán «No disponible» esos días en todas tus organizaciones; la nota solo la ves tú.
        </p>
      </div>

      <form className="grid gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))_minmax(0,2fr)_auto] sm:items-end" onSubmit={submit}>
        <label className="block">
          <span className="label">Desde</span>
          <input
            className="input"
            type="date"
            value={startsOn}
            min={today}
            onChange={(event) => {
              setStartsOn(event.target.value);
              if (endsOn && endsOn < event.target.value) setEndsOn('');
            }}
          />
        </label>
        <label className="block">
          <span className="label">Hasta (opcional)</span>
          <input className="input" type="date" value={endsOn} min={startsOn || today} onChange={(event) => setEndsOn(event.target.value)} />
        </label>
        <label className="block">
          <span className="label">Nota privada (opcional)</span>
          <input className="input" value={note} maxLength={200} placeholder="Ej.: viaje familiar" onChange={(event) => setNote(event.target.value)} />
        </label>
        <button type="submit" className="btn-primary" disabled={addMutation.isPending}>
          {addMutation.isPending ? 'Guardando...' : 'Agregar'}
        </button>
      </form>

      {error && <p className="rounded-xl border border-[#F27A6E]/30 bg-[#2A1817] p-3 text-sm text-[#F7A39A]" role="alert">{error}</p>}
      {list.isLoading && <p className="text-sm text-muted">Cargando tus fechas...</p>}

      {!list.isLoading && upcoming.length === 0 && (
        <p className="rounded-xl border border-dashed border-[#30333A] px-4 py-3 text-sm text-muted">No marcaste fechas próximas. Si no dices nada, se entiende que estás disponible.</p>
      )}
      {upcoming.length > 0 && <UnavailabilityList label="Fechas en que no estás disponible" rows={upcoming} disabled={deleteMutation.isPending} onDelete={remove} />}

      {past.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted hover:text-white">Fechas pasadas ({past.length})</summary>
          <div className="mt-2 opacity-70">
            <UnavailabilityList label="Fechas pasadas" rows={past} disabled={deleteMutation.isPending} onDelete={remove} />
          </div>
        </details>
      )}
    </section>
  );
}

function UnavailabilityList({ label, rows, disabled, onDelete }: { label: string; rows: Unavailability[]; disabled: boolean; onDelete: (id: string) => void }) {
  return (
    <ul className="divide-y divide-[#23252A]" aria-label={label}>
      {rows.map((row) => {
        const range = formatDayRange(row.startsOn, row.endsOn);
        return (
          <li key={row.id} className="flex items-center gap-3 py-2.5">
            <span className="icon-tile h-9 w-9 shrink-0 rounded-xl">
              <CalendarX2 className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-white">{range}</p>
              {row.note && <p className="truncate text-[13px] text-muted">{row.note}</p>}
            </div>
            <button type="button" className="btn-ghost h-9 w-9 p-0" aria-label={`Borrar ${range}`} disabled={disabled} onClick={() => onDelete(row.id)}>
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
