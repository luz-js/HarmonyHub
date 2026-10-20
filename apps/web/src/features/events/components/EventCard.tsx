import { Clock3, ListMusic, MapPin, Users } from 'lucide-react';
import type { EventSummary } from '../../../shared/types';
import { formatEventDate, formatEventTime } from '../utils';
import { EventDateTile } from './EventDateTile';
import { AttendanceBadge, EventStatusBadge } from './EventStatusBadge';

export function EventCard({ event, onOpen }: { event: EventSummary; onOpen: () => void }) {
  return (
    <button type="button" className="panel flex w-full gap-4 p-4 text-left transition hover:border-[#3D4048] sm:p-5" onClick={onOpen}>
      <EventDateTile startsAt={event.startsAt} />
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block truncate text-[17px] font-bold text-white">{event.name}</span>
            <span className="mt-0.5 block text-sm text-muted">{formatEventDate(event.startsAt)}</span>
          </span>
          <EventStatusBadge status={event.status} />
        </span>
        <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-[#D8D5CE]">
          <span className="flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-muted" /> {formatEventTime(event.startsAt, event.endsAt)}</span>
          {event.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-muted" /> {event.location}</span>}
          {event.setlist && <span className="flex items-center gap-1.5"><ListMusic className="h-4 w-4 text-muted" /> {event.setlist.name}</span>}
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-muted" /> {event.attendance.total > 0 ? `${event.attendance.confirmed} de ${event.attendance.total} confirmados` : 'Sin equipo todavía'}
          </span>
        </span>
        {event.myAttendance && (
          <span className="mt-3 flex items-center gap-2 text-sm text-muted">
            Tu respuesta: <AttendanceBadge status={event.myAttendance.status} />
          </span>
        )}
      </span>
    </button>
  );
}
