import type { SetlistMusicalRole } from '@prisma/client';
import { z } from 'zod';
import { SETLIST_MUSICAL_ROLES } from '../setlists/assignments/setlist-assignment.utils';

const DAY_MS = 86_400_000;
/** Un evento sin hora de fin se cuenta como de 2 horas para ver si choca con otro. */
export const DEFAULT_EVENT_DURATION_MS = 2 * 60 * 60 * 1000;
/** Un rango bloqueado puede durar hasta un año; la consulta de lideres, hasta 92 dias. */
export const MAX_UNAVAILABILITY_DAYS = 366;
export const MAX_QUERY_DAYS = 92;
/** Tope de rangos guardados por persona (pasados incluidos), para que la lista no crezca sin fin. */
export const MAX_UNAVAILABILITY_ROWS = 200;

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-11-03" -> Date a las 00:00 UTC (asi guarda Postgres una columna DATE). null si no es una fecha real. */
export function parseDay(value: string): Date | null {
  if (!DAY_PATTERN.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || formatDay(date) !== value ? null : date;
}

export function formatDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

export function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
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

const day = (label: string) => z.string({ message: `${label} es requerida` }).trim().refine((value) => parseDay(value) !== null, `${label} no es valida (AAAA-MM-DD)`);

export const createUnavailabilitySchema = z
  .object({
    startsOn: day('La fecha de inicio'),
    endsOn: day('La fecha de fin'),
    note: z
      .string()
      .trim()
      .max(200, 'La nota es demasiado larga')
      .nullable()
      .optional()
      .transform((value) => value || null),
  })
  .superRefine((value, context) => {
    const startsOn = parseDay(value.startsOn);
    const endsOn = parseDay(value.endsOn);
    if (!startsOn || !endsOn) return;
    if (endsOn < startsOn) context.addIssue({ code: 'custom', message: 'La fecha de fin no puede ser anterior a la de inicio', path: ['endsOn'] });
    else if (daysBetween(startsOn, endsOn) + 1 > MAX_UNAVAILABILITY_DAYS) context.addIssue({ code: 'custom', message: 'Un rango puede durar como maximo un año', path: ['endsOn'] });
  });

export const rangeQuerySchema = z.object({ from: day('La fecha desde').optional(), to: day('La fecha hasta').optional() });

export const availabilityQuerySchema = z.object({
  tz: z.string().optional(),
  role: z.enum(SETLIST_MUSICAL_ROLES, { message: 'Rol invalido' }).optional(),
});

/** Quien toca el rol pedido: primero quien lo tiene como instrumento principal, despues por nombre. */
export function rankForRole<T extends { name: string; instruments: { instrument: SetlistMusicalRole; isPrimary: boolean }[] }>(members: T[], role: SetlistMusicalRole) {
  return members
    .map((member) => ({ member, match: member.instruments.find((item) => item.instrument === role) }))
    .filter((entry) => entry.match)
    .sort((a, b) => Number(b.match!.isPrimary) - Number(a.match!.isPrimary) || a.member.name.localeCompare(b.member.name, 'es'))
    .map((entry) => ({ member: entry.member, isPrimary: entry.match!.isPrimary }));
}
