import type { MemberLoadStat, MemberLoadStats, RepertoireSongStat, RepertoireStats, StatsPeriod } from '@harmonyhub/contracts';
import type { AttendanceStatus, EventStatus, MembershipRole } from '@prisma/client';

/**
 * Que cuenta como "tocada": una cancion (item SONG visible) del setlist de un evento confirmado o terminado cuya
 * fecha de inicio ya paso. Borradores y pendientes no cuentan (no se sabe si se hicieron), los cancelados tampoco,
 * y las plantillas nunca (no tienen eventos de verdad).
 */
export const PLAYED_EVENT_STATUSES: readonly EventStatus[] = ['CONFIRMED', 'FINISHED'];
/** Una cancion es "olvidada" si se toco alguna vez pero no en los ultimos 6 meses. */
export const FORGOTTEN_MONTHS = 6;
export const TOP_SONGS_LIMIT = 10;
/** Listas largas (ultima vez, olvidadas, nunca tocadas): hasta 100 filas. */
export const LIST_LIMIT = 100;

/** Sobrecarga: 4 o mas eventos asignados (sin rechazar) en los proximos 30 dias. */
export const OVERLOADED_UPCOMING_EVENTS = 4;
export const OVERLOADED_WINDOW_DAYS = 30;
/** Sin servicio: no estuvo en ningun evento hecho en los ultimos 60 dias (o nunca). */
export const IDLE_DAYS = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Desde la misma fecha y hora, `months` meses atras (calendario: del 22 de octubre al 22 de abril). */
export function periodStart(now: Date, months: number) {
  const from = new Date(now);
  from.setUTCMonth(from.getUTCMonth() - months);
  return from;
}

export function statsPeriod(now: Date, months: number): StatsPeriod {
  return { months, from: periodStart(now, months).toISOString(), to: now.toISOString() };
}

/** Dentro del periodo: desde `from` (incluido) hasta ahora (sin incluir). */
const inPeriod = (date: Date, from: Date, now: Date) => date.getTime() >= from.getTime() && date.getTime() < now.getTime();

// ======================= Repertorio =======================

export type PlayedEventRow = {
  id: string;
  startsAt: Date;
  status: EventStatus;
  setlist: {
    isTemplate: boolean;
    items: Array<{ songId: string | null; type: string; isHidden: boolean; keyOverride: string | null; songVersion: { key: string } | null }>;
  } | null;
};

export type SongRow = { id: string; title: string; artist: string; currentKey: string; status: string };

export function isPlayedEvent(event: Pick<PlayedEventRow, 'startsAt' | 'status' | 'setlist'>, now: Date) {
  return PLAYED_EVENT_STATUSES.includes(event.status) && event.startsAt.getTime() < now.getTime() && Boolean(event.setlist) && !event.setlist!.isTemplate;
}

/** Cada cancion tocada en cada evento, una vez por evento (aunque el setlist la repita), con la tonalidad usada. */
export function playedOccurrences(events: PlayedEventRow[], songs: Map<string, SongRow>, now: Date) {
  const occurrences: Array<{ eventId: string; startsAt: Date; songId: string; key: string | null }> = [];
  for (const event of events) {
    if (!isPlayedEvent(event, now)) continue;
    const seen = new Set<string>();
    for (const item of event.setlist!.items) {
      if (item.type !== 'SONG' || item.isHidden || !item.songId || seen.has(item.songId)) continue;
      seen.add(item.songId);
      const key = item.keyOverride || item.songVersion?.key || songs.get(item.songId)?.currentKey || null;
      occurrences.push({ eventId: event.id, startsAt: event.startsAt, songId: item.songId, key });
    }
  }
  return occurrences;
}

const byTitle = (a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title, 'es');

export function computeRepertoireStats({ events, songs, now, months }: { events: PlayedEventRow[]; songs: SongRow[]; now: Date; months: number }): RepertoireStats {
  const songById = new Map(songs.map((song) => [song.id, song]));
  const from = periodStart(now, months);
  const occurrences = playedOccurrences(events, songById, now);

  const lastPlayed = new Map<string, Date>();
  const periodCount = new Map<string, number>();
  const keyCount = new Map<string, number>();
  const periodEvents = new Set<string>();
  for (const occurrence of occurrences) {
    const previous = lastPlayed.get(occurrence.songId);
    if (!previous || occurrence.startsAt > previous) lastPlayed.set(occurrence.songId, occurrence.startsAt);
    if (!inPeriod(occurrence.startsAt, from, now)) continue;
    periodEvents.add(occurrence.eventId);
    periodCount.set(occurrence.songId, (periodCount.get(occurrence.songId) ?? 0) + 1);
    if (occurrence.key) keyCount.set(occurrence.key, (keyCount.get(occurrence.key) ?? 0) + 1);
  }

  const stat = (songId: string): RepertoireSongStat => {
    const song = songById.get(songId);
    return { songId, title: song?.title ?? 'Canción eliminada', artist: song?.artist ?? '', timesPlayed: periodCount.get(songId) ?? 0, lastPlayedAt: lastPlayed.get(songId)?.toISOString() ?? null };
  };
  const isActive = (songId: string) => songById.get(songId)?.status !== 'ARCHIVED' && songById.has(songId);
  const forgottenBefore = periodStart(now, FORGOTTEN_MONTHS);

  return {
    period: statsPeriod(now, months),
    rules: { playedEventStatuses: [...PLAYED_EVENT_STATUSES], forgottenMonths: FORGOTTEN_MONTHS },
    totals: { eventsPlayed: periodEvents.size, songsPlayed: periodCount.size, activeSongs: songs.filter((song) => song.status !== 'ARCHIVED').length },
    topSongs: [...periodCount.keys()]
      .map(stat)
      .sort((a, b) => b.timesPlayed - a.timesPlayed || (b.lastPlayedAt ?? '').localeCompare(a.lastPlayedAt ?? '') || byTitle(a, b))
      .slice(0, TOP_SONGS_LIMIT),
    lastPlayed: [...lastPlayed.keys()]
      .filter((songId) => songById.has(songId))
      .map(stat)
      .sort((a, b) => (b.lastPlayedAt ?? '').localeCompare(a.lastPlayedAt ?? '') || byTitle(a, b))
      .slice(0, LIST_LIMIT),
    forgotten: [...lastPlayed.entries()]
      .filter(([songId, date]) => isActive(songId) && date.getTime() < forgottenBefore.getTime())
      .map(([songId]) => stat(songId))
      .sort((a, b) => (a.lastPlayedAt ?? '').localeCompare(b.lastPlayedAt ?? '') || byTitle(a, b))
      .slice(0, LIST_LIMIT),
    neverPlayed: songs
      .filter((song) => song.status !== 'ARCHIVED' && !lastPlayed.has(song.id))
      .map((song) => ({ songId: song.id, title: song.title, artist: song.artist }))
      .sort(byTitle)
      .slice(0, LIST_LIMIT),
    keys: [...keyCount.entries()].map(([key, timesPlayed]) => ({ key, timesPlayed })).sort((a, b) => b.timesPlayed - a.timesPlayed || a.key.localeCompare(b.key)),
  };
}

// ======================= Carga por musico =======================

export type MemberRow = { membershipId: string; userId: string; name: string; avatarUrl: string | null; role: MembershipRole };
export type AssignmentRow = { membershipId: string; attendance: AttendanceStatus; startsAt: Date; eventStatus: EventStatus };
export type UnavailabilityRow = { userId: string; startsOn: Date; endsOn: Date };

/** Dias (de calendario, UTC) marcados como no disponibles entre hoy y los proximos `days` dias, sin repetir. */
export function unavailableDays(ranges: Array<{ startsOn: Date; endsOn: Date }>, now: Date, days = OVERLOADED_WINDOW_DAYS) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const last = today + (days - 1) * DAY_MS;
  const marked = new Set<number>();
  for (const range of ranges) {
    for (let day = Math.max(range.startsOn.getTime(), today); day <= Math.min(range.endsOn.getTime(), last); day += DAY_MS) marked.add(day);
  }
  return marked.size;
}

export function computeMemberLoad({
  members,
  assignments,
  unavailability,
  now,
  months,
}: {
  members: MemberRow[];
  assignments: AssignmentRow[];
  unavailability: UnavailabilityRow[];
  now: Date;
  months: number;
}): MemberLoadStats {
  const from = periodStart(now, months);
  const windowEnd = now.getTime() + OVERLOADED_WINDOW_DAYS * DAY_MS;
  const idleBefore = now.getTime() - IDLE_DAYS * DAY_MS;

  const rows = members.map((member): MemberLoadStat => {
    const mine = assignments.filter((row) => row.membershipId === member.membershipId && row.eventStatus !== 'CANCELLED');
    const past = mine.filter((row) => inPeriod(row.startsAt, from, now));
    const upcoming = mine.filter((row) => row.startsAt.getTime() >= now.getTime() && row.attendance !== 'DECLINED').sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    const served = mine
      .filter((row) => PLAYED_EVENT_STATUSES.includes(row.eventStatus) && row.startsAt.getTime() < now.getTime() && row.attendance !== 'DECLINED')
      .reduce<Date | null>((latest, row) => (!latest || row.startsAt > latest ? row.startsAt : latest), null);
    return {
      ...member,
      inTeam: past.length,
      confirmed: past.filter((row) => row.attendance === 'CONFIRMED').length,
      declined: past.filter((row) => row.attendance === 'DECLINED').length,
      upcoming: upcoming.length,
      nextEventAt: upcoming[0]?.startsAt.toISOString() ?? null,
      lastServiceAt: served?.toISOString() ?? null,
      unavailableDaysNext30: unavailableDays(unavailability.filter((range) => range.userId === member.userId), now),
      overloaded: upcoming.filter((row) => row.startsAt.getTime() < windowEnd).length >= OVERLOADED_UPCOMING_EVENTS,
      idle: !served || served.getTime() < idleBefore,
    };
  });

  return {
    period: statsPeriod(now, months),
    thresholds: { overloadedUpcomingEvents: OVERLOADED_UPCOMING_EVENTS, overloadedWindowDays: OVERLOADED_WINDOW_DAYS, idleDays: IDLE_DAYS },
    members: rows.sort((a, b) => b.inTeam - a.inTeam || b.upcoming - a.upcoming || a.name.localeCompare(b.name, 'es')),
  };
}
