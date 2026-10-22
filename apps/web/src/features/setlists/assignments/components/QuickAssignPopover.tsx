import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import type { SetlistItemType, SetlistMusicalRole } from '../../../../shared/types';
import { AvailabilityBadges } from '../../../availability/components/AvailabilityBadges';
import { availabilityByMembership, useSetlistAvailability } from '../../../availability/hooks';
import { primaryInstrumentLabel } from '../../../profile/utils/instrumentGroups';
import { useCreateSetlistAssignment } from '../hooks/useSetlistAssignmentMutations';
import { useSetlistParticipants } from '../hooks/useSetlistParticipants';
import { MusicalRolePicker } from './MusicalRolePicker';

export function QuickAssignPopover({
  organizationId,
  setlistId,
  itemId,
  itemType,
}: {
  organizationId: string;
  setlistId: string;
  itemId: string;
  itemType: SetlistItemType;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [participantId, setParticipantId] = useState('');
  const [role, setRole] = useState<SetlistMusicalRole | ''>('');

  const participantsQuery = useSetlistParticipants(organizationId, setlistId);
  const createMutation = useCreateSetlistAssignment(organizationId, setlistId, itemId);
  const availability = availabilityByMembership(useSetlistAvailability(organizationId, setlistId, open).data?.members);

  const participants = participantsQuery.data || [];
  const filtered = participants.filter((participant) => participant.membership.user.name.toLowerCase().includes(search.trim().toLowerCase()));

  function reset() {
    setOpen(false);
    setParticipantId('');
    setRole('');
    setSearch('');
  }

  function handleAssign() {
    if (!participantId || !role) return;
    createMutation.mutate({ participantId, role }, { onSuccess: reset });
  }

  return (
    <div className="relative">
      <button type="button" className="btn-ghost h-8 px-3 text-xs" onClick={() => setOpen((value) => !value)}>
        <Plus className="h-3.5 w-3.5" /> Asignar músico
      </button>

      {open && (
        <>
          <button type="button" aria-label="Cerrar" className="fixed inset-0 z-10 cursor-default" onClick={reset} />
          <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg border border-[#30333A] bg-[#23252A] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            {!participantId ? (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                  <input className="input pl-8" placeholder="Buscar en el equipo..." value={search} onChange={(event) => setSearch(event.target.value)} />
                </div>
                <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                  {filtered.map((participant) => (
                    <button
                      key={participant.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-white hover:bg-white/[0.06]"
                      onClick={() => setParticipantId(participant.id)}
                    >
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="truncate">{participant.membership.user.name}</span>
                        <AvailabilityBadges availability={availability.get(participant.membership.id)} />
                      </span>
                      <span className="shrink-0 text-xs text-muted">{primaryInstrumentLabel(participant.membership.user.instruments)}</span>
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="px-2 py-3 text-xs text-muted">
                      Nadie en el equipo todavia. Agrega participantes desde el panel de Equipo del setlist.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="mb-2 text-xs text-muted">
                  Asignando a <span className="font-semibold text-white">{participants.find((p) => p.id === participantId)?.membership.user.name}</span>
                </p>
                <MusicalRolePicker itemType={itemType} value={role} onChange={setRole} />
                <div className="mt-2 flex justify-end gap-2">
                  <button type="button" className="btn-ghost h-8 px-3 text-xs" onClick={() => setParticipantId('')}>
                    Volver
                  </button>
                  <button type="button" className="btn-primary h-8 px-3 text-xs" disabled={!role || createMutation.isPending} onClick={handleAssign}>
                    Asignar
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
