import type { SetlistMusicalRole } from '@prisma/client';

/** Los dias AAAA-MM-DD y el esquema de una fecha bloqueada viven en @harmonyhub/contracts (los usa tambien la web). */
export { createUnavailabilitySchema, daysBetween, formatDay, MAX_UNAVAILABILITY_DAYS, parseDay } from '@harmonyhub/contracts';

const DAY_MS = 86_400_000;
/** Un evento sin hora de fin se cuenta como de 2 horas para ver si choca con otro. */
export const DEFAULT_EVENT_DURATION_MS = 2 * 60 * 60 * 1000;
/** La consulta de lideres abarca hasta 92 dias. */
export const MAX_QUERY_DAYS = 92;
/** Tope de rangos guardados por persona (pasados incluidos), para que la lista no crezca sin fin. */
export const MAX_UNAVAILABILITY_ROWS = 200;

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

/** La zona horaria del navegador (ej. "America/Mexico_City"); si no es valida, UTC. */
export function safeTimeZone(value: unknown) {
  if (typeof value !== 'string' || !value) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: value });
    return value;
  } catch {
    return 'UTC';
  }
}

/** El dia de calendario de un instante en una zona horaria: un evento a las 23:00 de Mexico es ese dia, no el siguiente en UTC. */
export function localDay(instant: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);
}

export function eventWindow(event: { startsAt: Date; endsAt: Date | null }) {
  return { start: event.startsAt, end: event.endsAt ?? new Date(event.startsAt.getTime() + DEFAULT_EVENT_DURATION_MS) };
}

/** Dos horarios chocan si uno empieza antes de que el otro termine (tocarse en el borde no cuenta). */
export function windowsOverlap(a: { start: Date; end: Date }, b: { start: Date; end: Date }) {
  return a.start < b.end && b.start < a.end;
}

/** Quien toca el rol pedido: primero quien lo tiene como instrumento principal, despues por nombre. */
export function rankForRole<T extends { name: string; instruments: { instrument: SetlistMusicalRole; isPrimary: boolean }[] }>(members: T[], role: SetlistMusicalRole) {
  return members
    .map((member) => ({ member, match: member.instruments.find((item) => item.instrument === role) }))
    .filter((entry) => entry.match)
    .sort((a, b) => Number(b.match!.isPrimary) - Number(a.match!.isPrimary) || a.member.name.localeCompare(b.member.name, 'es'))
    .map((entry) => ({ member: entry.member, isPrimary: entry.match!.isPrimary }));
}
