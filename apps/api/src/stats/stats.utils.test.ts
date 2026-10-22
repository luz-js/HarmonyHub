import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  computeMemberLoad,
  computeRepertoireStats,
  isPlayedEvent,
  periodStart,
  unavailableDays,
  type AssignmentRow,
  type PlayedEventRow,
  type SongRow,
} from './stats.utils';

const now = new Date('2026-10-22T12:00:00.000Z');
const DAY = 86_400_000;
const daysAgo = (days: number) => new Date(now.getTime() - days * DAY);

const songs: SongRow[] = [
  { id: 'a', title: 'Amazing', artist: 'X', currentKey: 'G', status: 'ACTIVE' },
  { id: 'b', title: 'Bendito', artist: 'Y', currentKey: 'D', status: 'ACTIVE' },
  { id: 'c', title: 'Cuán grande', artist: 'Z', currentKey: 'C', status: 'ACTIVE' },
  { id: 'd', title: 'Digno', artist: 'W', currentKey: 'E', status: 'ACTIVE' },
  { id: 'z', title: 'Zarza archivada', artist: 'V', currentKey: 'A', status: 'ARCHIVED' },
];

type Item = PlayedEventRow['setlist'] extends infer S ? (S extends { items: Array<infer I> } ? I : never) : never;
const song = (songId: string, extra: Partial<Item> = {}): Item => ({ songId, type: 'SONG', isHidden: false, keyOverride: null, songVersion: { key: songs.find((row) => row.id === songId)?.currentKey ?? 'C' }, ...extra });
const event = (id: string, startsAt: Date, items: Item[], extra: Partial<PlayedEventRow> = {}): PlayedEventRow => ({ id, startsAt, status: 'FINISHED', setlist: { isTemplate: false, items }, ...extra });

test('periodo: misma fecha N meses atras', () => {
  assert.equal(periodStart(now, 6).toISOString(), '2026-04-22T12:00:00.000Z');
  assert.equal(periodStart(now, 12).toISOString(), '2025-10-22T12:00:00.000Z');
});

test('solo cuentan eventos confirmados o terminados, ya pasados y sin plantilla', () => {
  const base = event('e', daysAgo(1), []);
  assert.equal(isPlayedEvent(base, now), true);
  assert.equal(isPlayedEvent({ ...base, status: 'CONFIRMED' }, now), true);
  for (const status of ['DRAFT', 'PENDING', 'CANCELLED'] as const) assert.equal(isPlayedEvent({ ...base, status }, now), false, status);
  assert.equal(isPlayedEvent({ ...base, startsAt: now }, now), false, 'el que empieza justo ahora todavia no paso');
  assert.equal(isPlayedEvent({ ...base, setlist: { isTemplate: true, items: [] } }, now), false);
  assert.equal(isPlayedEvent({ ...base, setlist: null }, now), false);
});

test('repertorio: mas tocadas, tonalidades, ocultos, cancelados y bordes del periodo', () => {
  const stats = computeRepertoireStats({
    songs,
    now,
    months: 6,
    events: [
      event('e1', daysAgo(10), [song('a'), song('b', { keyOverride: 'E' }), song('a')]),
      event('e2', daysAgo(40), [song('a'), song('c', { isHidden: true })]),
      event('e3', daysAgo(5), [song('d')], { status: 'CANCELLED' }),
      event('e4', daysAgo(3), [song('d')], { status: 'DRAFT' }),
      event('e5', new Date(now.getTime() + DAY), [song('d')], { status: 'CONFIRMED' }),
      event('e6', periodStart(now, 6), [song('b')]),
      event('e7', new Date(periodStart(now, 6).getTime() - 1), [song('c')]),
      event('e8', daysAgo(400), [song('z')]),
    ],
  });

  assert.deepEqual(stats.topSongs.map((row) => [row.songId, row.timesPlayed]), [['a', 2], ['b', 2]], 'repetida en el mismo evento cuenta una vez');
  assert.equal(stats.totals.eventsPlayed, 3, 'e1, e2 y e6 (el borde de inicio cuenta)');
  assert.equal(stats.totals.songsPlayed, 2);
  assert.equal(stats.totals.activeSongs, 4);
  assert.deepEqual(stats.keys, [{ key: 'G', timesPlayed: 2 }, { key: 'D', timesPlayed: 1 }, { key: 'E', timesPlayed: 1 }], 'la tonalidad usada en el setlist');
  assert.equal(stats.lastPlayed.find((row) => row.songId === 'b')?.lastPlayedAt, daysAgo(10).toISOString());

  // c solo se toco justo antes del periodo (el oculto de e2 no cuenta): olvidada. d nunca se toco de verdad.
  assert.deepEqual(stats.forgotten.map((row) => row.songId), ['c']);
  assert.deepEqual(stats.neverPlayed.map((row) => row.songId), ['d']);
  assert.ok(!stats.forgotten.some((row) => row.songId === 'z'), 'las archivadas no son olvidadas');
  assert.deepEqual(stats.rules, { playedEventStatuses: ['CONFIRMED', 'FINISHED'], forgottenMonths: 6 });
});

test('repertorio vacio', () => {
  const stats = computeRepertoireStats({ songs: [], events: [], now, months: 3 });
  assert.deepEqual([stats.topSongs, stats.keys, stats.forgotten, stats.neverPlayed], [[], [], [], []]);
  assert.equal(stats.period.months, 3);
});

test('dias no disponibles en los proximos 30 dias, sin repetir los que se pisan', () => {
  const day = (offset: number) => new Date(Date.UTC(2026, 9, 22 + offset));
  assert.equal(unavailableDays([{ startsOn: day(-5), endsOn: day(1) }], now), 2, 'hoy y mañana');
  assert.equal(unavailableDays([{ startsOn: day(2), endsOn: day(4) }, { startsOn: day(3), endsOn: day(5) }], now), 4);
  assert.equal(unavailableDays([{ startsOn: day(29), endsOn: day(40) }], now), 1, 'solo hasta el dia 30');
  assert.equal(unavailableDays([{ startsOn: day(-10), endsOn: day(-1) }], now), 0);
});

test('carga por musico: equipo, confirmados, rechazados, proximos, ultimo servicio y umbrales', () => {
  const at = (membershipId: string, startsAt: Date, attendance: AssignmentRow['attendance'] = 'CONFIRMED', eventStatus: AssignmentRow['eventStatus'] = 'FINISHED'): AssignmentRow => ({ membershipId, startsAt, attendance, eventStatus });
  const soon = (days: number) => new Date(now.getTime() + days * DAY);
  const stats = computeMemberLoad({
    now,
    months: 6,
    members: [
      { membershipId: 'm1', userId: 'u1', name: 'Ana', avatarUrl: null, role: 'MUSICIAN' },
      { membershipId: 'm2', userId: 'u2', name: 'Beto', avatarUrl: null, role: 'MUSICIAN' },
      { membershipId: 'm3', userId: 'u3', name: 'Carla', avatarUrl: null, role: 'LEADER' },
    ],
    assignments: [
      at('m1', daysAgo(7)),
      at('m1', daysAgo(14), 'PENDING'),
      at('m1', daysAgo(21), 'DECLINED'),
      at('m1', daysAgo(3), 'CONFIRMED', 'CANCELLED'),
      ...[2, 5, 9, 20].map((days) => at('m1', soon(days), 'PENDING', 'CONFIRMED')),
      at('m1', soon(10), 'DECLINED', 'CONFIRMED'),
      at('m2', daysAgo(90)),
      at('m2', daysAgo(300)),
      at('m2', soon(40), 'CONFIRMED', 'CONFIRMED'),
    ],
    unavailability: [{ userId: 'u2', startsOn: new Date(Date.UTC(2026, 9, 25)), endsOn: new Date(Date.UTC(2026, 9, 26)) }],
  });

  const [ana, beto, carla] = stats.members;
  assert.deepEqual([ana.name, beto.name, carla.name], ['Ana', 'Beto', 'Carla']);
  assert.deepEqual({ inTeam: ana.inTeam, confirmed: ana.confirmed, declined: ana.declined, upcoming: ana.upcoming }, { inTeam: 3, confirmed: 1, declined: 1, upcoming: 4 }, 'el cancelado no cuenta');
  assert.equal(ana.nextEventAt, soon(2).toISOString());
  assert.equal(ana.lastServiceAt, daysAgo(7).toISOString());
  assert.equal(ana.overloaded, true, '4 proximos en 30 dias');
  assert.equal(ana.idle, false);

  assert.equal(beto.inTeam, 1, 'el de hace 300 dias queda fuera del periodo');
  assert.equal(beto.idle, true, 'su ultimo servicio fue hace 90 dias');
  assert.equal(beto.overloaded, false);
  assert.equal(beto.unavailableDaysNext30, 2);

  assert.equal(carla.lastServiceAt, null);
  assert.equal(carla.idle, true, 'nunca sirvio');
  assert.deepEqual(stats.thresholds, { overloadedUpcomingEvents: 4, overloadedWindowDays: 30, idleDays: 60 });
});
