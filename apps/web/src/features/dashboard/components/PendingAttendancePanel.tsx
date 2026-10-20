import { useState } from 'react';
import type { DashboardPendingAttendance } from '../../../shared/types';
import { AttendanceActions } from '../../events/components';
import { useUpdateEventMusician } from '../../events/hooks';
import { formatEventDate, formatEventTime } from '../../events/utils';

/** Eventos proximos donde el usuario actual todavia no respondio su asistencia. */
export function PendingAttendancePanel({
  organizationId,
  items,
  onOpenEvent,
}: {
  organizationId: string;
  items: DashboardPendingAttendance[];
  onOpenEvent: (eventId: string) => void;
}) {
  const updateMutation = useUpdateEventMusician(organizationId);
  const [error, setError] = useState('');

  return (
    <section className="panel flex flex-col gap-4 rounded-[18px] p-5 sm:p-6">
      <h2 className="section-title">Te falta responder</h2>
      {error && <p className="text-sm text-[#F7A39A]">{error}</p>}
      {items.map((item) => (
        <div key={item.musicianId} className="space-y-3 rounded-xl bg-[#141518] p-3.5">
          <button type="button" className="block w-full text-left" onClick={() => onOpenEvent(item.event.id)}>
            <span className="block truncate text-base font-bold text-white">{item.event.name}</span>
            <span className="mt-0.5 block text-sm text-muted">
              {formatEventDate(item.event.startsAt, { weekday: 'long', day: 'numeric', month: 'short' })} · {formatEventTime(item.event.startsAt)}
            </span>
          </button>
          <AttendanceActions
            status="PENDING"
            size="lg"
            disabled={updateMutation.isPending}
            onChange={(status) => {
              setError('');
              updateMutation.mutate(
                { eventId: item.event.id, musicianId: item.musicianId, input: { status } },
                { onError: (err: unknown) => setError(err instanceof Error ? err.message : 'No se pudo guardar tu respuesta') },
              );
            }}
          />
        </div>
      ))}
      {items.length === 0 && <p className="text-[15px] text-muted">Estás al día: no tienes confirmaciones pendientes.</p>}
    </section>
  );
}
