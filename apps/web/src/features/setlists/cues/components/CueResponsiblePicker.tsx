import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useSetlistParticipants } from '../../assignments/hooks/useSetlistParticipants';

/**
 * Selecciona un `SetlistParticipant` como responsable general del cue. No expone eleccion de
 * `SetlistAssignment` especifico (responsable por item) para mantener la UI simple — el backend
 * ya soporta ambos, esta es una simplificacion deliberada del picker.
 */
export function CueResponsiblePicker({
  organizationId,
  setlistId,
  value,
  onChange,
}: {
  organizationId: string;
  setlistId: string;
  value: string | null;
  onChange: (participantId: string | null) => void;
}) {
  const participantsQuery = useSetlistParticipants(organizationId, setlistId);
  const [search, setSearch] = useState('');

  const participants = participantsQuery.data ?? [];
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return participants;
    return participants.filter((participant) => participant.membership.user.name.toLowerCase().includes(term));
  }, [participants, search]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="label">Responsable</span>
        {value && (
          <button type="button" className="text-[11px] text-muted hover:text-white" onClick={() => onChange(null)}>
            Quitar
          </button>
        )}
      </div>
      <div className="relative mt-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        <input className="input pl-8" placeholder="Buscar en el equipo..." value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      <div className="mt-1 max-h-40 space-y-1 overflow-y-auto">
        {filtered.map((participant) => (
          <button
            key={participant.id}
            type="button"
            className={
              value === participant.id
                ? 'flex w-full items-center justify-between rounded-md bg-white/10 px-2 py-1.5 text-left text-sm text-white'
                : 'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-white hover:bg-white/[0.06]'
            }
            onClick={() => onChange(participant.id)}
          >
            <span className="truncate">{participant.membership.user.name}</span>
            <span className="shrink-0 text-xs text-muted">{participant.membership.instrument || ''}</span>
          </button>
        ))}
        {filtered.length === 0 && <p className="px-2 py-3 text-xs text-muted">Nadie en el equipo todavía.</p>}
      </div>
    </div>
  );
}
