import { z } from 'zod';
import { SETLIST_MUSICAL_ROLES } from './enums';

const DAY_MS = 86_400_000;
/** Un rango bloqueado puede durar hasta un año. */
export const MAX_UNAVAILABILITY_DAYS = 366;

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

export function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

const day = (label: string) => z.string({ message: `${label} es requerida` }).trim().refine((value) => parseDay(value) !== null, `${label} no es valida (AAAA-MM-DD)`);

// ---- Pedidos ----

/** POST /api/me/unavailability: un dia o un rango (ambos incluidos) con una nota privada opcional. */
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
export type CreateUnavailabilityInput = z.input<typeof createUnavailabilitySchema>;
export type CreateUnavailabilityData = z.output<typeof createUnavailabilitySchema>;

/** GET /api/availability?from&to (dias AAAA-MM-DD). */
export const unavailabilityRangeQuerySchema = z.object({ from: day('La fecha desde').optional(), to: day('La fecha hasta').optional() });
export type UnavailabilityRangeQueryData = z.output<typeof unavailabilityRangeQuerySchema>;

/** GET /api/events/:id/availability y /api/setlists/:id/availability: zona horaria del navegador y, opcional, un rol. */
export const teamAvailabilityQuerySchema = z.object({
  tz: z.string().optional(),
  role: z.enum(SETLIST_MUSICAL_ROLES, { message: 'Rol invalido' }).optional(),
});
export type TeamAvailabilityQueryData = z.output<typeof teamAvailabilityQuerySchema>;

// ---- Respuestas ----

/** Una fecha (o rango de fechas) en que la persona no puede tocar. Dias AAAA-MM-DD, ambos incluidos. */
export type Unavailability = {
  id: string;
  startsOn: string;
  endsOn: string;
  /** Privada: solo la ve la propia persona en "Mi perfil". */
  note: string | null;
  createdAt: string;
};

export type AvailabilityConflict = { eventId: string; name: string; startsAt: string };

/** Lo que un lider ve de cada miembro para un evento: nunca la nota, solo si esta disponible. */
export type MemberAvailability = {
  membershipId: string;
  userId: string;
  name: string;
  unavailable: boolean;
  conflicts: AvailabilityConflict[];
};

export type TeamAvailability = {
  /** El evento con el que se compara (para un setlist, su proximo evento; null si no tiene). */
  event: { id: string; name: string; startsAt: string; endsAt: string | null } | null;
  members: MemberAvailability[];
  suggestions: { membershipId: string; name: string; isPrimary: boolean }[];
};

/** GET /api/availability: quien no esta disponible en el rango (sin notas). */
export type UnavailabilityRange = {
  from: string;
  to: string;
  items: { membershipId: string; userId: string; name: string; ranges: { startsOn: string; endsOn: string }[] }[];
};
