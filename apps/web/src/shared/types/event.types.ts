import type { SetlistStatus } from './setlist.types';

export type EventStatus = 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'FINISHED';
export type AttendanceStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED';

export type EventSetlistRef = {
  id: string;
  name: string;
  status: SetlistStatus;
  estimatedSec: number;
  itemCount: number;
};

export type EventAttendanceSummary = {
  total: number;
  confirmed: number;
  pending: number;
  declined: number;
};

export type EventSummary = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  description: string | null;
  status: EventStatus;
  setlist: EventSetlistRef | null;
  attendance: EventAttendanceSummary;
  myAttendance: { musicianId: string; status: AttendanceStatus } | null;
  updatedAt: string;
};

export type EventMusician = {
  id: string;
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  instrument: string | null;
  status: AttendanceStatus;
  note: string | null;
};

export type EventDetail = EventSummary & {
  allowedStatusTransitions: EventStatus[];
  musicians: EventMusician[];
  createdAt: string;
};

export type EventListResponse = {
  items: EventSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type EventListFilters = {
  from?: string;
  to?: string;
  status?: EventStatus;
  search?: string;
  includeCancelled?: boolean;
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
};

export type CreateEventInput = {
  name: string;
  startsAt: string;
  endsAt?: string | null;
  location?: string | null;
  description?: string | null;
  setlistId?: string | null;
  status?: 'DRAFT' | 'PENDING' | 'CONFIRMED';
};

export type UpdateEventInput = Partial<Omit<CreateEventInput, 'status'>> & { status?: EventStatus };

export type AddEventMusicianInput = { membershipId: string; instrument?: string | null; note?: string | null };

export type UpdateEventMusicianInput = { status?: AttendanceStatus; instrument?: string | null; note?: string | null };
