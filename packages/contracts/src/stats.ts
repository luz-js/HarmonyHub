import { z } from 'zod';
import type { MembershipRole } from './enums';

// ======================= Pedidos =======================

/** Periodos de la pagina Estadisticas: ultimos 3, 6 (por defecto) o 12 meses. */
export const STATS_PERIOD_MONTHS = [3, 6, 12] as const;
export type StatsPeriodMonths = (typeof STATS_PERIOD_MONTHS)[number];

/** GET /api/stats/repertoire y GET /api/stats/members */
export const statsQuerySchema = z.object({
  months: z.coerce
    .number<number>()
    .int()
    .refine((value): value is StatsPeriodMonths => (STATS_PERIOD_MONTHS as readonly number[]).includes(value), 'El periodo debe ser 3, 6 o 12 meses')
    .default(6),
});
export type StatsQueryInput = z.input<typeof statsQuerySchema>;
export type StatsQueryData = z.output<typeof statsQuerySchema>;

// ======================= Respuestas =======================

export type StatsPeriod = { months: number; from: string; to: string };

export type RepertoireSongStat = {
  songId: string;
  title: string;
  artist: string;
  /** Veces que se toco en el periodo (una por evento). */
  timesPlayed: number;
  lastPlayedAt: string | null;
};

export type RepertoireKeyStat = { key: string; timesPlayed: number };

/** GET /api/stats/repertoire */
export type RepertoireStats = {
  period: StatsPeriod;
  /** Reglas con las que se calculo, para explicarlas en la pantalla. */
  rules: { playedEventStatuses: string[]; forgottenMonths: number };
  totals: { eventsPlayed: number; songsPlayed: number; activeSongs: number };
  /** Las mas tocadas del periodo (hasta 10). */
  topSongs: RepertoireSongStat[];
  /** Ultima vez que se toco cada cancion que se toco alguna vez, la mas reciente primero. */
  lastPlayed: RepertoireSongStat[];
  /** Tocadas alguna vez, pero no en los ultimos `forgottenMonths` meses (la mas olvidada primero). */
  forgotten: RepertoireSongStat[];
  /** Canciones activas que nunca se tocaron en un evento. */
  neverPlayed: Array<{ songId: string; title: string; artist: string }>;
  /** Reparto por tonalidad de lo tocado en el periodo (la tonalidad en que se toco, no la original). */
  keys: RepertoireKeyStat[];
};

export type MemberLoadStat = {
  membershipId: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: MembershipRole;
  /** En el equipo de eventos del periodo que ya pasaron (sin cancelados), con cualquier respuesta. */
  inTeam: number;
  confirmed: number;
  declined: number;
  /** Proximos eventos asignados que no rechazo. */
  upcoming: number;
  nextEventAt: string | null;
  /** Ultimo evento ya hecho (confirmado o terminado) en el que estuvo sin rechazarlo. */
  lastServiceAt: string | null;
  /** Dias marcados como "no disponible" en los proximos 30 dias (sin la nota). */
  unavailableDaysNext30: number;
  overloaded: boolean;
  idle: boolean;
};

/** GET /api/stats/members (solo quien arma equipos) */
export type MemberLoadStats = {
  period: StatsPeriod;
  thresholds: { overloadedUpcomingEvents: number; overloadedWindowDays: number; idleDays: number };
  members: MemberLoadStat[];
};
