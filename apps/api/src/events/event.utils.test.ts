import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertEventStatusTransition,
  assertValidEventSchedule,
  getAllowedEventStatusTransitions,
  InvalidEventScheduleError,
  InvalidEventStatusTransitionError,
  isEventLocked,
  summarizeAttendance,
} from './event.utils';

test('assertEventStatusTransition permite el flujo DRAFT -> PENDING -> CONFIRMED -> FINISHED', () => {
  assert.doesNotThrow(() => assertEventStatusTransition('DRAFT', 'PENDING'));
  assert.doesNotThrow(() => assertEventStatusTransition('PENDING', 'CONFIRMED'));
  assert.doesNotThrow(() => assertEventStatusTransition('CONFIRMED', 'FINISHED'));
});

test('assertEventStatusTransition permite cancelar antes de terminar y reabrir a borrador', () => {
  assert.doesNotThrow(() => assertEventStatusTransition('CONFIRMED', 'CANCELLED'));
  assert.doesNotThrow(() => assertEventStatusTransition('CANCELLED', 'DRAFT'));
});

test('assertEventStatusTransition bloquea saltos invalidos y cambios sobre eventos terminados', () => {
  assert.throws(() => assertEventStatusTransition('DRAFT', 'FINISHED'), InvalidEventStatusTransitionError);
  assert.throws(() => assertEventStatusTransition('FINISHED', 'DRAFT'), InvalidEventStatusTransitionError);
  assert.throws(() => assertEventStatusTransition('CANCELLED', 'CONFIRMED'), InvalidEventStatusTransitionError);
  assert.deepEqual(getAllowedEventStatusTransitions('FINISHED'), []);
});

test('assertEventStatusTransition no falla si el estado no cambia', () => {
  assert.doesNotThrow(() => assertEventStatusTransition('FINISHED', 'FINISHED'));
});

test('assertValidEventSchedule acepta fin vacio o posterior al inicio', () => {
  const start = new Date('2026-10-18T09:00:00.000Z');
  assert.doesNotThrow(() => assertValidEventSchedule(start));
  assert.doesNotThrow(() => assertValidEventSchedule(start, null));
  assert.doesNotThrow(() => assertValidEventSchedule(start, new Date('2026-10-18T11:00:00.000Z')));
});

test('assertValidEventSchedule rechaza fin anterior al inicio y fechas invalidas', () => {
  const start = new Date('2026-10-18T09:00:00.000Z');
  assert.throws(() => assertValidEventSchedule(start, new Date('2026-10-18T08:00:00.000Z')), InvalidEventScheduleError);
  assert.throws(() => assertValidEventSchedule(new Date('no-es-fecha')), InvalidEventScheduleError);
});

test('summarizeAttendance cuenta confirmados, pendientes y rechazados', () => {
  assert.deepEqual(
    summarizeAttendance([{ status: 'CONFIRMED' }, { status: 'CONFIRMED' }, { status: 'PENDING' }, { status: 'DECLINED' }]),
    { total: 4, confirmed: 2, pending: 1, declined: 1 },
  );
  assert.deepEqual(summarizeAttendance([]), { total: 0, confirmed: 0, pending: 0, declined: 0 });
});

test('isEventLocked solo bloquea eventos cancelados o terminados', () => {
  assert.equal(isEventLocked('CANCELLED'), true);
  assert.equal(isEventLocked('FINISHED'), true);
  assert.equal(isEventLocked('CONFIRMED'), false);
  assert.equal(isEventLocked('DRAFT'), false);
});
