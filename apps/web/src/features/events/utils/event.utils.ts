import type { AttendanceStatus, CreateEventInput, EventStatus } from '../../../shared/types';

export const eventStatusLabels: Record<EventStatus, string> = {
  DRAFT: 'Borrador',
  PENDING: 'Por confirmar',
  CONFIRMED: 'Confirmado',
  CANCELLED: 'Cancelado',
  FINISHED: 'Terminado',
};

/** Texto del boton que lleva el evento a cada estado. */
export const eventStatusActionLabels: Record<EventStatus, string> = {
  DRAFT: 'Volver a borrador',
  PENDING: 'Pedir confirmaciones',
  CONFIRMED: 'Confirmar evento',
  CANCELLED: 'Cancelar evento',
  FINISHED: 'Marcar como terminado',
};

export const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  PENDING: 'Sin responder',
  CONFIRMED: 'Confirmado',
  DECLINED: 'No puede',
};

export function getEventStatusLabel(status: EventStatus) {
  return eventStatusLabels[status] || status;
}

export function getAttendanceStatusLabel(status: AttendanceStatus) {
  return attendanceStatusLabels[status] || status;
}

/** OWNER/ADMIN/LEADER gestionan eventos; el backend es la fuente de verdad, esto solo evita mostrar acciones inutiles. */
export function canManageEventsClientSide(role?: string) {
  return role === 'OWNER' || role === 'ADMIN' || role === 'LEADER';
}

export function canDeleteEventsClientSide(role?: string) {
  return role === 'OWNER' || role === 'ADMIN';
}

/** Un evento cancelado o terminado no acepta cambios en el equipo (igual que en el backend). */
export function isEventLocked(status: EventStatus) {
  return status === 'CANCELLED' || status === 'FINISHED';
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

/** Fecha local en formato YYYY-MM-DD, para inputs type="date" y para agrupar por dia. */
export function toLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Hora local en formato HH:mm, para inputs type="time". */
export function toLocalTimeValue(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Combina un dia (YYYY-MM-DD) y una hora (HH:mm) locales en un Date; null si no es valido. */
export function combineLocalDateTime(day: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [year, month, date] = day.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const value = new Date(year, month - 1, date, hours, minutes);
  return Number.isNaN(value.getTime()) ? null : value;
}

/** "Domingo, 18 de octubre": solo la primera letra en mayuscula. */
export function formatEventDate(iso: string, options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }) {
  const label = new Date(iso).toLocaleDateString('es-ES', options);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatEventTime(startsAt: string, endsAt?: string | null) {
  const start = toLocalTimeValue(new Date(startsAt));
  return endsAt ? `${start} - ${toLocalTimeValue(new Date(endsAt))}` : start;
}

export type EventDraft = {
  name: string;
  day: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  setlistId: string;
};

export function emptyEventDraft(day = toLocalDateKey(new Date())): EventDraft {
  return { name: '', day, startTime: '19:00', endTime: '', location: '', description: '', setlistId: '' };
}

export function eventToDraft(event: { name: string; startsAt: string; endsAt: string | null; location: string | null; description: string | null; setlist: { id: string } | null }): EventDraft {
  const start = new Date(event.startsAt);
  return {
    name: event.name,
    day: toLocalDateKey(start),
    startTime: toLocalTimeValue(start),
    endTime: event.endsAt ? toLocalTimeValue(new Date(event.endsAt)) : '',
    location: event.location || '',
    description: event.description || '',
    setlistId: event.setlist?.id || '',
  };
}

/** Convierte el borrador del formulario en el payload del API, validando lo mismo que el backend. */
export function buildEventInput(draft: EventDraft): { input: CreateEventInput; error?: undefined } | { input?: undefined; error: string } {
  const name = draft.name.trim();
  if (!name) return { error: 'El nombre es requerido.' };

  const startsAt = combineLocalDateTime(draft.day, draft.startTime);
  if (!startsAt) return { error: 'Indica la fecha y la hora de inicio.' };

  let endsAt: Date | null = null;
  if (draft.endTime) {
    endsAt = combineLocalDateTime(draft.day, draft.endTime);
    if (!endsAt) return { error: 'La hora de fin no es valida.' };
    if (endsAt.getTime() < startsAt.getTime()) return { error: 'La hora de fin no puede ser anterior a la de inicio.' };
  }

  return {
    input: {
      name,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt ? endsAt.toISOString() : null,
      location: draft.location.trim() || null,
      description: draft.description.trim() || null,
      setlistId: draft.setlistId || null,
    },
  };
}
