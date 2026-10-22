import { useState } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { OverlayDialog } from '../../../shared/components/OverlayDialog';
import type { AttendanceStatus, EventDetail } from '../../../shared/types';
import { formatRole, plural } from '../../../shared/utils/format';
import { AvailabilityBadges } from '../../availability/components/AvailabilityBadges';
import { availabilityByMembership, useEventAvailability } from '../../availability/hooks';
import { primaryInstrumentLabel } from '../../profile/utils/instrumentGroups';
import { MemberPicker } from '../../setlists/assignments/components/MemberPicker';
import { useAddEventMusician, useRemoveEventMusician, useUpdateEventMusician } from '../hooks';
import { attendanceStatusLabels, isEventLocked } from '../utils';
import { AttendanceActions } from './AttendanceActions';
import { AttendanceBadge } from './EventStatusBadge';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

/** Color del avatar segun la respuesta: verde si va, rojo si no puede, gris si no respondio. */
const AVATAR_CLASS: Record<AttendanceStatus, string> = {
  CONFIRMED: 'bg-[#17291F] text-[#57C98F]',
  DECLINED: 'bg-[#2A1817] text-[#F27A6E]',
  PENDING: 'bg-[#23252A] text-[#A6A39D]',
};

/** Equipo del evento: cada musico responde su asistencia y los lideres arman el equipo. */
export function EventTeamPanel({
  event,
  organizationId,
  currentUserId,
  canManage,
}: {
  event: EventDetail;
  organizationId: string;
  currentUserId?: string;
  canManage: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState('');
  const addMutation = useAddEventMusician(organizationId, event.id);
  const updateMutation = useUpdateEventMusician(organizationId);
  const removeMutation = useRemoveEventMusician(organizationId, event.id);
  const locked = isEventLocked(event.status);
  // Solo quien arma el equipo ve los choques (la API no se los muestra a musicos ni invitados).
  const availabilityQuery = useEventAvailability(organizationId, event.id, canManage && !locked);
  const availability = availabilityByMembership(availabilityQuery.data?.members);
  const { attendance } = event;

  function onError(err: unknown) {
    setError(err instanceof Error ? err.message : 'No se pudo actualizar el equipo');
  }

  function changeStatus(musicianId: string, status: AttendanceStatus) {
    setError('');
    updateMutation.mutate({ eventId: event.id, musicianId, input: { status } }, { onError });
  }

  function addMember(membershipId: string) {
    setError('');
    addMutation.mutate({ membershipId }, { onSuccess: () => setShowAdd(false), onError });
  }

  function removeMember(musicianId: string) {
    setError('');
    removeMutation.mutate(musicianId, { onError });
  }

  const summaryDetails = [
    attendance.declined ? `${attendance.declined} no ${attendance.declined === 1 ? 'puede' : 'pueden'}` : '',
    attendance.pending ? `${attendance.pending} sin responder` : '',
  ].filter(Boolean);

  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="section-title">Equipo</h2>
          {attendance.total > 0 && (
            <p className="mt-1 text-sm text-muted">
              <span className="font-semibold text-white">{attendance.confirmed} de {plural(attendance.total, 'confirmado')}</span>
              {summaryDetails.length > 0 && ` · ${summaryDetails.join(' · ')}`}
            </p>
          )}
        </div>
        {canManage && !locked && (
          <button className="btn-ghost h-10 text-sm" onClick={() => setShowAdd(true)}><UserPlus className="h-4 w-4" /> Agregar músico</button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-[#F7A39A]">{error}</p>}

      <div className="mt-3 divide-y divide-[#23252A]">
        {event.musicians.map((musician) => {
          const isSelf = musician.userId === currentUserId;
          const hasControls = !locked && (isSelf || canManage);
          return (
            <div key={musician.id} className="flex min-h-[56px] flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${AVATAR_CLASS[musician.status]}`}>
                {initials(musician.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-white">{musician.name}{isSelf && <span className="font-medium text-muted"> (tú)</span>}</p>
                <p className="truncate text-[13px] text-muted">{musician.instrument || primaryInstrumentLabel(musician.instruments) || formatRole(musician.role)}{musician.note ? ` · ${musician.note}` : ''}</p>
                {musician.status !== 'DECLINED' && <div className="mt-1"><AvailabilityBadges availability={availability.get(musician.membershipId)} /></div>}
              </div>
              <div className={`flex items-center gap-2 ${hasControls ? 'basis-full pl-12 sm:basis-auto sm:pl-0' : ''}`}>
                {isSelf && !locked ? (
                  <AttendanceActions status={musician.status} disabled={updateMutation.isPending} onChange={(status) => changeStatus(musician.id, status)} />
                ) : canManage && !locked ? (
                  <select
                    className="select h-9 w-auto text-sm"
                    aria-label={`Asistencia de ${musician.name}`}
                    value={musician.status}
                    onChange={(changeEvent) => changeStatus(musician.id, changeEvent.target.value as AttendanceStatus)}
                  >
                    {(Object.keys(attendanceStatusLabels) as AttendanceStatus[]).map((status) => (
                      <option key={status} value={status}>{attendanceStatusLabels[status]}</option>
                    ))}
                  </select>
                ) : (
                  <AttendanceBadge status={musician.status} />
                )}
                {canManage && !locked && (
                  <button
                    className="btn-ghost h-9 w-9 p-0"
                    aria-label={`Quitar a ${musician.name}`}
                    disabled={removeMutation.isPending}
                    onClick={() => removeMember(musician.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {event.musicians.length === 0 && (
          <p className="py-4 text-sm text-muted">
            {canManage ? 'Todavía no hay músicos en este evento. Agrega al equipo para pedir confirmaciones.' : 'Todavía no hay músicos asignados.'}
          </p>
        )}
      </div>

      {showAdd && (
        <OverlayDialog title="Agregar músico" subtitle="Selecciona un miembro de la organización" onClose={() => setShowAdd(false)}>
          <MemberPicker
            organizationId={organizationId}
            excludeMembershipIds={event.musicians.map((musician) => musician.membershipId)}
            onSelect={addMember}
            availability={availability}
          />
        </OverlayDialog>
      )}
    </section>
  );
}
