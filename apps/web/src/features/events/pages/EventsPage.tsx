import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CalendarPlus, History, Plus, Search } from 'lucide-react';
import { getCurrentOrganizationId } from '../../../shared/api/http';
import type { EventStatus } from '../../../shared/types';
import { takeUrlFlag } from '../../../shared/utils';
import { downloadMyEventsIcs } from '../api/events.client';
import { getCurrentUser } from '../../setlists/utils';
import { CalendarDownloadButton, EventCard, EventFormDialog } from '../components';
import { useCreateEvent, useEvents } from '../hooks';
import { buildEventInput, canManageEventsClientSide, emptyEventDraft, EventDraft, eventStatusLabels } from '../utils';
import { useEventSetlistOptions } from './useEventSetlistOptions';

type Navigate = (href: string) => void;
type EventsTab = 'upcoming' | 'past';

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
}

export function EventsPage({ navigate }: { navigate: Navigate }) {
  const organizationId = getCurrentOrganizationId() || '';
  const currentUser = useMemo(() => getCurrentUser(), []);
  const canManage = canManageEventsClientSide(currentUser.role);
  const todayIso = useMemo(() => startOfToday(), []);

  const [tab, setTab] = useState<EventsTab>('upcoming');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<EventStatus | ''>('');
  const [showCreate, setShowCreate] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (takeUrlFlag('nuevo') && canManage) setShowCreate(true);
  }, [canManage]);

  const upcoming = tab === 'upcoming';
  const eventsQuery = useEvents(organizationId, {
    from: upcoming ? todayIso : undefined,
    to: upcoming ? undefined : todayIso,
    order: upcoming ? 'asc' : 'desc',
    search: search.trim() || undefined,
    status: status || undefined,
    pageSize: 100,
  });
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
      setShowCreate(false);
      navigate(`/events/${created.id}`);
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo crear el evento');
    }
  }

  const events = eventsQuery.data?.items || [];

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-title">Eventos</h1>
          <p className="page-subtitle">Servicios, ensayos y conciertos con su setlist y la asistencia del equipo.</p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <CalendarDownloadButton label="Exportar mis eventos (.ics)" fileName="mis-eventos.ics" download={downloadMyEventsIcs} />
          <button className="btn-ghost" onClick={() => navigate('/calendar')}><CalendarDays className="h-4 w-4" /> Calendario</button>
          {canManage && <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Nuevo evento</button>}
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2" role="tablist" aria-label="Periodo">
          <button role="tab" type="button" aria-selected={upcoming} className="tab-pill" onClick={() => setTab('upcoming')}>
            <CalendarPlus className="h-4 w-4" /> Próximos
          </button>
          <button role="tab" type="button" aria-selected={!upcoming} className="tab-pill" onClick={() => setTab('past')}>
            <History className="h-4 w-4" /> Pasados
          </button>
        </div>
        <label className="relative min-w-0 flex-1 basis-full sm:basis-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input className="input pl-9" placeholder="Buscar evento..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <select className="select w-full sm:w-auto" aria-label="Estado" value={status} onChange={(event) => setStatus(event.target.value as EventStatus | '')}>
          <option value="">Todos los estados</option>
          {(Object.keys(eventStatusLabels) as EventStatus[]).map((value) => (
            <option key={value} value={value}>{eventStatusLabels[value]}</option>
          ))}
        </select>
      </section>

      {eventsQuery.isLoading && <section className="panel p-5 text-muted">Cargando eventos...</section>}
      {eventsQuery.error instanceof Error && (
        <section className="rounded-xl border border-[#F27A6E]/30 bg-[#2A1817] p-4 text-sm text-[#F7A39A]">{eventsQuery.error.message}</section>
      )}
      {!eventsQuery.isLoading && !eventsQuery.error && events.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#30333A] bg-[#141518] px-6 py-12 text-center">
          <span className="icon-tile mx-auto h-12 w-12 rounded-2xl"><CalendarDays className="h-6 w-6" /></span>
          <h3 className="mt-4 text-lg font-bold text-white">{upcoming ? 'No hay eventos próximos.' : 'No hay eventos pasados.'}</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
            {upcoming && canManage ? 'Programa el próximo servicio o ensayo y pide confirmación al equipo.' : 'Cuando haya eventos aparecerán aquí.'}
          </p>
          {upcoming && canManage && (
            <button className="btn-primary mt-5" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Nuevo evento</button>
          )}
        </div>
      )}
      <div className="grid gap-3 xl:grid-cols-2">
        {events.map((event) => <EventCard key={event.id} event={event} onOpen={() => navigate(`/events/${event.id}`)} />)}
      </div>

      {showCreate && (
        <EventFormDialog
          mode="create"
          initial={emptyEventDraft()}
          setlistOptions={setlistOptions}
          submitting={createMutation.isPending}
          error={formError}
          onSubmit={(draft) => void handleCreate(draft)}
          onClose={() => {
            setFormError('');
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}
