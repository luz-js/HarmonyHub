import { z } from 'zod';
import type { UserInstrumentRef } from './auth';
import { booleanQueryParam } from './query';
import { ATTENDANCE_STATUSES, EVENT_STATUSES, type AttendanceStatus, type EventStatus, type SetlistStatus } from './enums';

const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();

// ---- Pedidos ----

/** POST /api/events. Las fechas viajan como texto ISO y la API las convierte en Date. */
export const createEventSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').max(150),
  startsAt: z.coerce.date<string | Date>(),
  endsAt: z.coerce.date<string | Date>().optional().nullable(),
  location: optionalText(200),
  description: optionalText(2000),
  setlistId: z.string().trim().min(1).optional().nullable(),
  status: z.enum(['DRAFT', 'PENDING', 'CONFIRMED']).optional(),
});
export type CreateEventInput = z.input<typeof createEventSchema>;
export type CreateEventData = z.output<typeof createEventSchema>;

/** PATCH /api/events/:id. El estado acepta cualquier valor; la API valida que la transicion sea posible. */
export const updateEventSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').max(150).optional(),
  startsAt: z.coerce.date<string | Date>().optional(),
  endsAt: z.coerce.date<string | Date>().optional().nullable(),
  location: optionalText(200),
  description: optionalText(2000),
  setlistId: z.string().trim().min(1).optional().nullable(),
  status: z.enum(EVENT_STATUSES).optional(),
});
export type UpdateEventInput = z.input<typeof updateEventSchema>;
export type UpdateEventData = z.output<typeof updateEventSchema>;

/** GET /api/events (query). */
export const eventListQuerySchema = z.object({
  from: z.coerce.date<string | Date>().optional(),
  to: z.coerce.date<string | Date>().optional(),
  status: z.enum(EVENT_STATUSES).optional(),
  search: z.string().trim().min(1).optional(),
  includeCancelled: booleanQueryParam(z.boolean().optional()),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number<string | number>().int().min(1).optional().default(1),
  pageSize: z.coerce.number<string | number>().int().min(1).max(200).optional().default(50),
});
export type EventListQueryData = z.output<typeof eventListQuerySchema>;

/** POST /api/events/:id/musicians */
export const addEventMusicianSchema = z.object({
  membershipId: z.string().trim().min(1, 'El miembro es requerido'),
  instrument: optionalText(80),
  note: optionalText(500),
});
export type AddEventMusicianInput = z.input<typeof addEventMusicianSchema>;
export type AddEventMusicianData = z.output<typeof addEventMusicianSchema>;

/** PATCH /api/events/:id/musicians/:musicianId: cada musico responde su asistencia; un lider cambia el resto. */
export const updateEventMusicianSchema = z.object({
  status: z.enum(ATTENDANCE_STATUSES).optional(),
  instrument: optionalText(80),
  note: optionalText(500),
});
export type UpdateEventMusicianInput = z.input<typeof updateEventMusicianSchema>;
export type UpdateEventMusicianData = z.output<typeof updateEventMusicianSchema>;

// ---- Respuestas ----

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
  /** Lo asignado para este evento; si es null se muestra el principal de su perfil (instruments). */
  instrument: string | null;
  instruments: UserInstrumentRef[];
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
