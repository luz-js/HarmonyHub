import { useMemo } from 'react';
import { CalendarPlus, Clock3, ListMusic, MapPin, Presentation, Music2, Plus } from 'lucide-react';
import { getCurrentOrganizationId } from '../../../shared/api/http';
import type { AttendanceStatus, EventAttendanceSummary, EventSummary } from '../../../shared/types';
import { plural } from '../../../shared/utils';
import { AttendanceBadge, EventDateTile, EventStatusBadge } from '../../events/components';
import { canManageEventsClientSide, formatEventDate, formatEventTime } from '../../events/utils';
import { MyInvitationsBanner } from '../../invitations/components/MyInvitationsBanner';
import { getCurrentUser } from '../../setlists/utils';
import { ActivityFeed, PendingAttendancePanel } from '../components';
import { useDashboard } from '../hooks';
import { getGreeting } from '../utils';

type User = { name: string };
type Navigate = (href: string) => void;

export function DashboardPage({ user, navigate }: { user: User; navigate: Navigate }) {
  const organizationId = getCurrentOrganizationId() || '';
  const currentUser = useMemo(() => getCurrentUser(), []);
  const canManage = canManageEventsClientSide(currentUser.role);
  const dashboardQuery = useDashboard(organizationId);
  const summary = dashboardQuery.data;
  const error = dashboardQuery.error instanceof Error ? dashboardQuery.error.message : '';
  const today = useMemo(() => formatEventDate(new Date().toISOString()), []);

  return (
    <div className="space-y-6 lg:space-y-7">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-muted">{today}</p>
          <h1 className="mt-1 text-[32px] font-bold leading-tight text-white sm:text-[40px]">{getGreeting()}, {user.name.split(' ')[0]}</h1>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2.5">
            <button className="btn-ghost h-11 px-4 text-[15px]" onClick={() => navigate('/songs?nuevo=1')}><Music2 className="h-4 w-4" /> Canción</button>
            <button className="btn-ghost h-11 px-4 text-[15px]" onClick={() => navigate('/setlists?nuevo=1')}><ListMusic className="h-4 w-4" /> Setlist</button>
            <button className="btn-primary h-11 px-[18px] text-[15px]" onClick={() => navigate('/events?nuevo=1')}><Plus className="h-4 w-4" /> Nuevo evento</button>
          </div>
        )}
      </section>

      <MyInvitationsBanner onOpen={() => navigate('/invitations')} />

      {error && <section className="rounded-xl border border-[#F27A6E]/30 bg-[#2A1817] p-4 text-sm text-[#F7A39A]">{error}</section>}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <NextEventHero event={summary?.nextEvent ?? null} loading={dashboardQuery.isLoading} canManage={canManage} navigate={navigate} />
        <PendingAttendancePanel
          organizationId={organizationId}
          items={summary?.pendingAttendance || []}
          onOpenEvent={(eventId) => navigate(`/events/${eventId}`)}
        />
      </section>

      {summary && (
        <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatTile value={summary.counts.songs} label={summary.counts.songs === 1 ? 'canción en el repertorio' : 'canciones en el repertorio'} onClick={() => navigate('/songs')} />
          <StatTile value={summary.counts.setlists} label={summary.counts.setlists === 1 ? 'setlist activo' : 'setlists activos'} onClick={() => navigate('/setlists')} />
          <StatTile value={summary.counts.members} label={summary.counts.members === 1 ? 'músico en el equipo' : 'músicos en el equipo'} onClick={() => navigate('/musicians')} />
          <StatTile value={summary.counts.upcomingEvents} label={summary.counts.upcomingEvents === 1 ? 'evento próximo' : 'eventos próximos'} onClick={() => navigate('/events')} />
        </section>
      )}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
        <section className="panel p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="section-title">Próximos eventos</h2>
            <button className="text-[15px] font-semibold text-primary hover:text-primary-soft" onClick={() => navigate('/calendar')}>Ver calendario</button>
          </div>
          {summary && summary.upcomingEvents.length > 1 ? (
            <div className="space-y-2">
              {summary.upcomingEvents.slice(1).map((event) => (
                <button
                  key={event.id}
                  className="flex w-full items-center gap-4 rounded-xl border border-transparent bg-[#141518] p-3 text-left transition hover:border-[#3D4048]"
                  onClick={() => navigate(`/events/${event.id}`)}
                >
                  <EventDateTile startsAt={event.startsAt} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-bold text-white">{event.name}</span>
                    <span className="mt-0.5 block truncate text-sm text-muted">
                      {formatEventDate(event.startsAt, { weekday: 'long' })} · {formatEventTime(event.startsAt, event.endsAt)}{event.location ? ` · ${event.location}` : ''}
                    </span>
                  </span>
                  <span className="hidden sm:block"><EventStatusBadge status={event.status} /></span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">{dashboardQuery.isLoading ? 'Cargando...' : 'No hay más eventos programados.'}</p>
          )}
        </section>

        <section className="panel p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="section-title">Actividad</h2>
            <button className="text-[15px] font-semibold text-primary hover:text-primary-soft" onClick={() => navigate('/notifications')}>Ver todo</button>
          </div>
          <ActivityFeed
            items={summary?.recentActivity || []}
            loading={dashboardQuery.isLoading}
            onOpenSong={(songId) => navigate(`/songs/${songId}`)}
          />
        </section>
      </section>
    </div>
  );
}

function NextEventHero({ event, loading, canManage, navigate }: { event: EventSummary | null; loading: boolean; canManage: boolean; navigate: Navigate }) {
  return (
    <section className="panel flex flex-col gap-5 rounded-[18px] p-5 sm:p-7">
      <p className="eyebrow">Próximo evento</p>
      {loading ? (
        <p className="text-muted">Cargando...</p>
      ) : event ? (
        <>
          <div className="flex items-center gap-4 sm:gap-5">
            <EventDateTile startsAt={event.startsAt} size="lg" />
            <div className="min-w-0 space-y-2.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h2 className="text-[26px] font-bold leading-tight text-white sm:text-[34px]">{event.name}</h2>
                <EventStatusBadge status={event.status} />
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[15px] text-[#D8D5CE]">
                <span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-muted" /> {formatEventTime(event.startsAt, event.endsAt)}</span>
                {event.location && <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted" /> {event.location}</span>}
                {event.setlist && <span className="flex items-center gap-2"><ListMusic className="h-4 w-4 text-muted" /> {event.setlist.name}</span>}
              </div>
            </div>
          </div>

          <TeamProgress attendance={event.attendance} myStatus={event.myAttendance?.status} />

          <div className="flex flex-wrap gap-2.5">
            <button className="btn-primary h-11 px-[18px] text-[15px]" onClick={() => navigate(`/events/${event.id}`)}>Ver evento</button>
            {event.setlist && (
              <>
                <button className="btn-ghost h-11 px-[18px] text-[15px]" onClick={() => navigate(`/setlists/${event.setlist!.id}`)}>Abrir setlist</button>
                <button
                  className="inline-flex h-11 items-center gap-2 rounded-[10px] px-3 text-[15px] font-semibold text-[#D8D5CE] transition hover:bg-white/5 hover:text-white"
                  onClick={() => navigate(`/setlists/${event.setlist!.id}?stage=1`)}
                >
                  <Presentation className="h-4 w-4" /> Stage Mode
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        <div>
          <h2 className="text-2xl font-bold text-white">No hay eventos programados</h2>
          <p className="mt-2 max-w-lg text-[15px] text-muted">
            {canManage ? 'Programa el próximo servicio o ensayo para que el equipo confirme su asistencia.' : 'Cuando tu líder programe un evento aparecerá aquí.'}
          </p>
          {canManage && <button className="btn-primary mt-5 h-11" onClick={() => navigate('/events?nuevo=1')}><CalendarPlus className="h-4 w-4" /> Programar evento</button>}
        </div>
      )}
    </section>
  );
}

/** Barra del equipo: confirmados en verde, los que no pueden en rojo y el resto sin responder. */
function TeamProgress({ attendance, myStatus }: { attendance: EventAttendanceSummary; myStatus?: AttendanceStatus }) {
  const { total, confirmed, declined, pending } = attendance;
  if (total === 0) {
    return <p className="rounded-xl bg-[#141518] p-4 text-sm text-muted">Todavía no hay músicos en el equipo de este evento.</p>;
  }
  const details = [declined ? `${declined} no ${declined === 1 ? 'puede' : 'pueden'}` : '', pending ? `${pending} sin responder` : ''].filter(Boolean);
  return (
    <div className="space-y-2.5 rounded-xl bg-[#141518] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[15px] font-semibold text-white">
          {confirmed} de {plural(total, 'confirmado')}
          {details.length > 0 && <span className="font-medium text-muted"> · {details.join(' · ')}</span>}
        </p>
        {myStatus && <span className="flex items-center gap-2 text-sm text-muted">Tú: <AttendanceBadge status={myStatus} /></span>}
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-[#23252A]" aria-hidden="true">
        <div className="bg-[#57C98F]" style={{ width: `${(confirmed / total) * 100}%` }} />
        <div className="bg-[#F27A6E]" style={{ width: `${(declined / total) * 100}%` }} />
      </div>
    </div>
  );
}

function StatTile({ label, value, onClick }: { label: string; value: number; onClick: () => void }) {
  return (
    <button className="panel rounded-[14px] p-4 text-left transition hover:border-[#3D4048] sm:p-5" onClick={onClick}>
      <p className="font-display text-[28px] font-bold leading-none text-white sm:text-[34px]">{value}</p>
      <p className="mt-2 text-sm text-muted">{label}</p>
    </button>
  );
}
