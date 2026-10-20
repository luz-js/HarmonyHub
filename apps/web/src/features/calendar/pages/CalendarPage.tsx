import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { getCurrentOrganizationId } from '../../../shared/api/http';
import { getCurrentUser } from '../../setlists/utils';
import { EventFormDialog, EventStatusBadge } from '../../events/components';
import { useCreateEvent, useEvents } from '../../events/hooks';
import { useEventSetlistOptions } from '../../events/pages/useEventSetlistOptions';
import { buildEventInput, canManageEventsClientSide, emptyEventDraft, EventDraft, formatEventDate, formatEventTime, toLocalDateKey } from '../../events/utils';
import { buildMonthGrid, currentMonth, formatMonthLabel, getGridRange, groupEventsByDay, shiftMonth, WEEKDAY_LABELS } from '../utils';

type Navigate = (href: string) => void;

const EVENT_CHIP_CLASS: Record<string, string> = {
  DRAFT: 'border-[#30333A] bg-[#23252A] text-[#C9C5BD]',
  PENDING: 'border-[#8FB4FF]/25 bg-[#1C2436] text-[#8FB4FF]',
  CONFIRMED: 'border-[#57C98F]/25 bg-[#17291F] text-[#57C98F]',
  CANCELLED: 'border-[#F27A6E]/25 bg-[#2A1817] text-[#F27A6E] line-through',
  FINISHED: 'border-[#30333A] bg-transparent text-muted',
};

/** En celular cada evento es un punto de color dentro del dia. */
const EVENT_DOT_CLASS: Record<string, string> = {
  DRAFT: 'bg-[#8A8780]',
  PENDING: 'bg-[#8FB4FF]',
  CONFIRMED: 'bg-[#57C98F]',
  CANCELLED: 'bg-[#F27A6E]',
  FINISHED: 'bg-[#5D5B57]',
};

export function CalendarPage({ navigate }: { navigate: Navigate }) {
  const organizationId = getCurrentOrganizationId() || '';
  const currentUser = useMemo(() => getCurrentUser(), []);
  const canManage = canManageEventsClientSide(currentUser.role);

  const [month, setMonth] = useState(() => currentMonth());
  const [createDay, setCreateDay] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [selectedDay, setSelectedDay] = useState(() => toLocalDateKey(new Date()));

  const days = useMemo(() => buildMonthGrid(month), [month]);
  const range = useMemo(() => getGridRange(days), [days]);
  const eventsQuery = useEvents(organizationId, { ...range, includeCancelled: true, order: 'asc', pageSize: 200 });
  const eventsByDay = useMemo(() => groupEventsByDay(eventsQuery.data?.items || []), [eventsQuery.data]);
  const selectedEvents = eventsByDay[selectedDay] || [];
  const setlistOptions = useEventSetlistOptions(organizationId);
  const createMutation = useCreateEvent(organizationId);

  async function handleCreate(draft: EventDraft) {
    setFormError('');
    const result = buildEventInput(draft);
    if (result.error !== undefined) {
      setFormError(result.error);
      return;
    }
    try {
      const created = await createMutation.mutateAsync(result.input);
      setCreateDay(null);
      navigate(`/events/${created.id}`);
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo crear el evento');
    }
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-title">Calendario</h1>
          <p className="page-subtitle">Vista mensual de servicios, ensayos y conciertos.</p>
        </div>
        {canManage && (
          <button className="btn-primary self-start md:self-auto" onClick={() => setCreateDay(toLocalDateKey(new Date()))}><Plus className="h-4 w-4" /> Nuevo evento</button>
        )}
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[#30333A] px-4 py-3 sm:px-5 sm:py-4">
          <h2 className="section-title">{formatMonthLabel(month)}</h2>
          <div className="flex items-center gap-2">
            <button className="btn-ghost h-10 w-10 p-0" aria-label="Mes anterior" onClick={() => setMonth((value) => shiftMonth(value, -1))}><ChevronLeft className="h-4 w-4" /></button>
            <button
              className="btn-ghost h-10 px-3"
              onClick={() => {
                setMonth(currentMonth());
                setSelectedDay(toLocalDateKey(new Date()));
              }}
            >
              Hoy
            </button>
            <button className="btn-ghost h-10 w-10 p-0" aria-label="Mes siguiente" onClick={() => setMonth((value) => shiftMonth(value, 1))}><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
        {eventsQuery.error instanceof Error && <p className="px-5 py-3 text-sm text-[#F7A39A]">{eventsQuery.error.message}</p>}
        <div className="grid grid-cols-7 border-b border-[#30333A]">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="px-1 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-faint md:px-3 md:text-left">{label}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayEvents = eventsByDay[day.key] || [];
            return (
              <div
                key={day.key}
                className={`group border-b border-r border-[#23252A] md:min-h-[108px] md:p-2 ${day.inMonth ? '' : 'bg-black/25'}`}
              >
                <button
                  type="button"
                  className={`flex h-14 w-full flex-col items-center justify-center gap-1 md:hidden ${selectedDay === day.key ? 'bg-primary-tint' : ''}`}
                  aria-label={`Ver eventos del ${day.date.getDate()}`}
                  aria-pressed={selectedDay === day.key}
                  onClick={() => setSelectedDay(day.key)}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${day.isToday ? 'bg-primary font-bold text-on-primary' : selectedDay === day.key ? 'font-bold text-primary' : day.inMonth ? 'text-[#D8D5CE]' : 'text-faint'}`}
                  >
                    {day.date.getDate()}
                  </span>
                  <span className="flex h-1.5 gap-1">
                    {dayEvents.slice(0, 3).map((event) => <span key={event.id} className={`h-1.5 w-1.5 rounded-full ${EVENT_DOT_CLASS[event.status] || EVENT_DOT_CLASS.DRAFT}`} />)}
                  </span>
                </button>
                <div className="hidden items-center justify-between md:flex">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] ${day.isToday ? 'bg-primary font-bold text-on-primary' : day.inMonth ? 'text-[#D8D5CE]' : 'text-faint'}`}
                  >
                    {day.date.getDate()}
                  </span>
                  {canManage && (
                    <button
                      className="hidden h-6 w-6 items-center justify-center rounded text-faint hover:bg-white/10 hover:text-white group-hover:flex"
                      aria-label={`Nuevo evento el ${day.key}`}
                      onClick={() => setCreateDay(day.key)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="mt-1 hidden space-y-1 md:block">
                  {dayEvents.map((event) => (
                    <button
                      key={event.id}
                      className={`block w-full truncate rounded-md border px-1.5 py-1 text-left text-xs font-medium ${EVENT_CHIP_CLASS[event.status] || EVENT_CHIP_CLASS.DRAFT}`}
                      title={`${event.name} · ${formatEventTime(event.startsAt, event.endsAt)}`}
                      onClick={() => navigate(`/events/${event.id}`)}
                    >
                      {formatEventTime(event.startsAt)} {event.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-2 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-title">{formatEventDate(new Date(`${selectedDay}T12:00:00`).toISOString())}</h2>
          {canManage && (
            <button className="btn-ghost h-10 px-3" onClick={() => setCreateDay(selectedDay)}><Plus className="h-4 w-4" /> Evento</button>
          )}
        </div>
        {selectedEvents.map((event) => (
          <button
            key={event.id}
            type="button"
            className="panel flex w-full items-center gap-3 rounded-[14px] p-3.5 text-left"
            onClick={() => navigate(`/events/${event.id}`)}
          >
            <span className="w-12 shrink-0 text-sm font-semibold text-[#D8D5CE]">{formatEventTime(event.startsAt)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-bold text-white">{event.name}</span>
              {event.location && <span className="block truncate text-sm text-muted">{event.location}</span>}
            </span>
            <EventStatusBadge status={event.status} />
          </button>
        ))}
        {selectedEvents.length === 0 && <p className="text-sm text-muted">No hay eventos este día.</p>}
      </section>

      {createDay && (
        <EventFormDialog
          mode="create"
          initial={emptyEventDraft(createDay)}
          setlistOptions={setlistOptions}
          submitting={createMutation.isPending}
          error={formError}
          onSubmit={(draft) => void handleCreate(draft)}
          onClose={() => {
            setFormError('');
            setCreateDay(null);
          }}
        />
      )}
    </div>
  );
}
