import type { UserInstrumentRef } from '../shared/user-instruments';
import { AttendanceStatus, EventStatus, getAllowedEventStatusTransitions, summarizeAttendance } from './event.utils';

type MapperEventSetlist = { id: string; name: string; status: string; estimatedSec: number; itemCount: number } | null;

type MapperEventMusician = {
  id: string;
  membershipId: string;
  instrument: string | null;
  status: string;
  note: string | null;
  membership: {
    id: string;
    role: string;
    user: { id: string; name: string; email: string; avatarUrl: string | null; instruments: UserInstrumentRef[] };
  };
};

type MapperEvent = {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  description: string | null;
  status: string;
  setlist: MapperEventSetlist;
  musicians: MapperEventMusician[];
  createdAt: Date;
  updatedAt: Date;
};

function mapEventMusician(musician: MapperEventMusician) {
  return {
    id: musician.id,
    membershipId: musician.membershipId,
    userId: musician.membership.user.id,
    name: musician.membership.user.name,
    email: musician.membership.user.email,
    avatarUrl: musician.membership.user.avatarUrl,
    role: musician.membership.role,
    /** Lo asignado para este evento; si no hay, la web muestra el principal de su perfil (instruments). */
    instrument: musician.instrument,
    instruments: musician.membership.user.instruments,
    status: musician.status as AttendanceStatus,
    note: musician.note,
  };
}

export function mapEventSummary(event: MapperEvent, currentUserId?: string) {
  const mine = currentUserId ? event.musicians.find((musician) => musician.membership.user.id === currentUserId) : undefined;
  return {
    id: event.id,
    name: event.name,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt ? event.endsAt.toISOString() : null,
    location: event.location,
    description: event.description,
    status: event.status as EventStatus,
    setlist: event.setlist,
    attendance: summarizeAttendance(event.musicians.map((musician) => ({ status: musician.status as AttendanceStatus }))),
    myAttendance: mine ? { musicianId: mine.id, status: mine.status as AttendanceStatus } : null,
    updatedAt: event.updatedAt.toISOString(),
  };
}

export function mapEventDetail(event: MapperEvent, currentUserId?: string) {
  return {
    ...mapEventSummary(event, currentUserId),
    allowedStatusTransitions: getAllowedEventStatusTransitions(event.status as EventStatus),
    musicians: event.musicians.map(mapEventMusician),
    createdAt: event.createdAt.toISOString(),
  };
}
