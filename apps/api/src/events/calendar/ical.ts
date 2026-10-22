/**
 * Generador de calendarios iCalendar (.ics, RFC 5545) para exportar eventos a Google Calendar, Apple Calendar,
 * Outlook, etc. Sin dependencias: texto con lineas CRLF, campos escapados y lineas largas plegadas.
 *
 * Zona horaria: las horas van en UTC (sufijo Z). Cada calendario las muestra en la hora local de quien lo abre,
 * asi que el evento queda a la hora correcta sin incluir definiciones de zonas horarias.
 */

export type IcsEventStatus = 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'FINISHED';

export type IcsEvent = {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  description: string | null;
  status: IcsEventStatus;
  setlistName?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Sin hora de fin, el evento se cuenta como de 2 horas (lo mismo que los avisos de choques). */
export const DEFAULT_EVENT_DURATION_MS = 2 * 60 * 60 * 1000;
const SEQUENCE_EPOCH = Date.UTC(2020, 0, 1);

/** UID estable: el mismo evento exportado dos veces actualiza el que ya estaba en el calendario, no lo duplica. */
export function eventUid(eventId: string) {
  return `event-${eventId}@harmonyhub`;
}

/** 2026-11-03T19:30:00.000Z -> 20261103T193000Z */
export function formatUtc(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Texto de un campo: \ ; , y saltos de linea se escapan (RFC 5545 3.3.11). */
export function escapeText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n');
}

/** Pliega una linea en trozos de hasta 75 bytes UTF-8 (sin cortar una letra con tilde a la mitad). */
export function foldLine(line: string) {
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char, 'utf8');
    const limit = parts.length === 0 ? 75 : 74; // las lineas siguientes empiezan con un espacio
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

/** Estado del evento en HarmonyHub -> estado iCalendar. Borrador y pendiente son "tentativo". */
export function icsStatus(status: IcsEventStatus) {
  if (status === 'CANCELLED') return 'CANCELLED';
  if (status === 'CONFIRMED' || status === 'FINISHED') return 'CONFIRMED';
  return 'TENTATIVE';
}

/** Numero de version que crece con cada cambio del evento (los calendarios usan el mas alto). */
export function sequenceOf(updatedAt: Date) {
  return Math.max(0, Math.floor((updatedAt.getTime() - SEQUENCE_EPOCH) / 60_000));
}

function eventLines(event: IcsEvent, now: Date) {
  const end = event.endsAt ?? new Date(event.startsAt.getTime() + DEFAULT_EVENT_DURATION_MS);
  const description = [event.description?.trim(), event.setlistName ? `Setlist: ${event.setlistName}` : null].filter(Boolean).join('\n\n');
  return [
    'BEGIN:VEVENT',
    `UID:${eventUid(event.id)}`,
    `DTSTAMP:${formatUtc(now)}`,
    `DTSTART:${formatUtc(event.startsAt)}`,
    `DTEND:${formatUtc(end)}`,
    `SUMMARY:${escapeText(event.name)}`,
    ...(event.location?.trim() ? [`LOCATION:${escapeText(event.location.trim())}`] : []),
    ...(description ? [`DESCRIPTION:${escapeText(description)}`] : []),
    `STATUS:${icsStatus(event.status)}`,
    `SEQUENCE:${sequenceOf(event.updatedAt)}`,
    `CREATED:${formatUtc(event.createdAt)}`,
    `LAST-MODIFIED:${formatUtc(event.updatedAt)}`,
    'END:VEVENT',
  ];
}

/** Calendario completo (uno o varios eventos), listo para descargar como .ics. */
export function buildCalendar({ name, events, now = new Date() }: { name: string; events: IcsEvent[]; now?: Date }) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HarmonyHub//Eventos//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`,
    ...events.flatMap((event) => eventLines(event, now)),
    'END:VCALENDAR',
  ];
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

/** "Culto de domingo!" -> "culto-de-domingo" (nombre del archivo descargado). */
export function icsFileName(value: string, fallback = 'evento') {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
  return `${slug || fallback}.ics`;
}
