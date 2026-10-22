import { useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, ChevronRight, ListMusic, MapPin, Pencil, Trash2 } from 'lucide-react';
import { getCurrentOrganizationId } from '../../../shared/api/http';
import type { AttendanceStatus, EventStatus } from '../../../shared/types';
import { plural } from '../../../shared/utils';
import { fileSlug } from '../../../shared/utils/download';
import { downloadEventIcs } from '../api/events.client';
import { SetlistStatusBadge } from '../../setlists/components/SetlistStatusBadge';
import { formatSetlistDuration, getCurrentUser } from '../../setlists/utils';
import { AttendanceActions, CalendarDownloadButton, EventFormDialog, EventStatusBadge, EventTeamPanel } from '../components';
import { useDeleteEvent, useEvent, useUpdateEvent, useUpdateEventMusician } from '../hooks';
import {
  buildEventInput,
  canDeleteEventsClientSide,
  canManageEventsClientSide,
  EventDraft,
  eventStatusActionLabels,
  eventToDraft,
  formatEventDate,
  formatEventTime,
  isEventLocked,
} from '../utils';
import { useEventSetlistOptions } from './useEventSetlistOptions';

type Navigate = (href: string) => void;

export function EventDetailPage({ id, navigate }: { id: string; navigate: Navigate }) {
  const organizationId = getCurrentOrganizationId() || '';
  const currentUser = useMemo(() => getCurrentUser(), []);
  const canManage = canManageEventsClientSide(currentUser.role);
  const canDelete = canDeleteEventsClientSide(currentUser.role);

  const [showEdit, setShowEdit] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');

  const eventQuery = useEvent(organizationId, id);
  const updateMutation = useUpdateEvent(organizationId);
  const deleteMutation = useDeleteEvent(organizationId);
  const attendanceMutation = useUpdateEventMusician(organizationId);
  const setlistOptions = useEventSetlistOptions(organizationId);

  async function handleUpdate(draft: EventDraft) {
    setFormError('');
    const result = buildEventInput(draft);
    if (result.error !== undefined) {
      setFormError(result.error);
      return;
    }
    try {
      await updateMutation.mutateAsync({ id, input: result.input });
      setShowEdit(false);
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo actualizar el evento');
    }
  }

  async function handleStatus(status: EventStatus) {
    setActionError('');
    if (status === 'CANCELLED' && !window.confirm('¿Cancelar este evento? El equipo ya no podrá cambiar su asistencia.')) return;
    try {
      await updateMutation.mutateAsync({ id, input: { status } });
    } catch (err: any) {
      setActionError(err?.message || 'No se pudo cambiar el estado');
    }
  }

  async function handleDelete() {
    if (!window.confirm('¿Eliminar este evento? Esta acción no se puede deshacer.')) return;
    try {
      await deleteMutation.mutateAsync(id);
      navigate('/events');
    } catch (err: any) {
      setActionError(err?.message || 'No se pudo eliminar el evento');
    }
  }

  function handleMyAttendance(musicianId: string, status: AttendanceStatus) {
    setActionError('');
    attendanceMutation.mutate(
      { eventId: id, musicianId, input: { status } },
      { onError: (err: unknown) => setActionError(err instanceof Error ? err.message : 'No se pudo guardar tu respuesta') },
    );
  }

  if (eventQuery.isLoading) return <section className="panel p-5 text-muted">Cargando evento...</section>;
  if (eventQuery.error) {
    const message = eventQuery.error instanceof Error ? eventQuery.error.message : 'No se pudo cargar el evento';
    return <section className="rounded-xl border border-[#F27A6E]/30 bg-[#2A1817] p-4 text-sm text-[#F7A39A]">{message}</section>;
  }

  const event = eventQuery.data;
  if (!event) return null;
  const locked = isEventLocked(event.status);

  const myAttendanceCard = event.myAttendance && !locked && (
    <section className="panel space-y-3.5 border-primary/70 p-[18px]">
      <div>
        <h2 className="text-[17px] font-bold text-white">¿Vas a estar?</h2>
        <p className="mt-0.5 text-sm text-muted">Tu respuesta le ayuda al líder a armar el equipo.</p>
      </div>
      <AttendanceActions
        status={event.myAttendance.status}
        size="lg"
        disabled={attendanceMutation.isPending}
        onChange={(status) => handleMyAttendance(event.myAttendance!.musicianId, status)}
      />
    </section>
  );

  return (
    <div className="space-y-5">
      <button className="-ml-2 inline-flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-muted transition hover:text-white" onClick={() => navigate('/events')}>
        <ArrowLeft className="h-4 w-4" /> Eventos
      </button>

      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2.5">
          <EventStatusBadge status={event.status} />
          <h1 className="text-[30px] font-bold leading-[1.08] text-white sm:text-[36px]">{event.name}</h1>
          <div className="flex flex-col gap-1.5 text-[15px] text-[#D8D5CE] sm:flex-row sm:flex-wrap sm:gap-x-5">
            <span className="flex items-center gap-2.5"><CalendarDays className="h-4 w-4 shrink-0 text-muted" /> {formatEventDate(event.startsAt)} · {formatEventTime(event.startsAt, event.endsAt)}</span>
            {event.location && <span className="flex items-center gap-2.5"><MapPin className="h-4 w-4 shrink-0 text-muted" /> {event.location}</span>}
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-2">
          <CalendarDownloadButton label="Agregar a mi calendario" fileName={`${fileSlug(event.name, 'evento')}.ics`} download={() => downloadEventIcs(event.id)} />
          {canManage && (
            <>
              {event.allowedStatusTransitions.map((status) => (
                <button
                  key={status}
                  className={status === 'CANCELLED' ? 'btn-danger' : status === 'CONFIRMED' || status === 'FINISHED' ? 'btn-primary' : 'btn-ghost'}
                  disabled={updateMutation.isPending}
                  onClick={() => void handleStatus(status)}
                >
                  {eventStatusActionLabels[status]}
                </button>
              ))}
              {event.status !== 'FINISHED' && (
                <button className="btn-ghost" onClick={() => setShowEdit(true)}><Pencil className="h-4 w-4" /> Editar</button>
              )}
              {canDelete && (
                <button className="btn-ghost w-10 px-0" aria-label="Eliminar evento" disabled={deleteMutation.isPending} onClick={() => void handleDelete()}>
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>
      </section>
      {actionError && <p className="text-sm text-[#F7A39A]">{actionError}</p>}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(340px,4fr)]">
        <div className="space-y-5">
          {myAttendanceCard}

          {event.setlist ? (
            <button
              className="panel flex w-full items-center gap-3.5 rounded-[14px] p-3.5 text-left transition hover:border-[#3D4048]"
              onClick={() => navigate(`/setlists/${event.setlist!.id}`)}
            >
              <span className="icon-tile h-11 w-11 shrink-0 rounded-xl"><ListMusic className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] text-muted">Setlist del evento</span>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-base font-bold text-white">{event.setlist.name}</span>
                  <SetlistStatusBadge status={event.setlist.status} />
                </span>
                <span className="mt-0.5 block text-[13px] text-muted">
                  {plural(event.setlist.itemCount, 'elemento')}
                  {event.setlist.estimatedSec > 0 && ` · Duración estimada ${formatSetlistDuration(event.setlist.estimatedSec)}`}
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
            </button>
          ) : (
            <section className="panel flex items-center gap-3.5 rounded-[14px] p-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#23252A] text-muted"><ListMusic className="h-5 w-5" /></span>
              <p className="text-sm text-muted">
                {canManage ? 'Este evento todavía no tiene setlist. Edítalo para vincular uno.' : 'Este evento todavía no tiene setlist.'}
              </p>
            </section>
          )}

          {event.description && (
            <section className="panel p-5 sm:p-6">
              <h2 className="section-title">Indicaciones</h2>
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-[#D8D5CE]">{event.description}</p>
            </section>
          )}
        </div>

        <EventTeamPanel event={event} organizationId={organizationId} currentUserId={currentUser.id} canManage={canManage} />
      </div>

      {showEdit && (
        <EventFormDialog
          mode="edit"
          initial={eventToDraft(event)}
          setlistOptions={
            event.setlist && !setlistOptions.some((option) => option.id === event.setlist!.id)
              ? [{ id: event.setlist.id, name: event.setlist.name }, ...setlistOptions]
              : setlistOptions
          }
          submitting={updateMutation.isPending}
          error={formError}
          onSubmit={(draft) => void handleUpdate(draft)}
          onClose={() => {
            setFormError('');
            setShowEdit(false);
          }}
        />
      )}
    </div>
  );
}
