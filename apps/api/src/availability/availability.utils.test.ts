import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createUnavailabilitySchema, eventWindow, localDay, parseDay, rankForRole, safeTimeZone, windowsOverlap } from './availability.utils';

test('parseDay solo acepta fechas reales AAAA-MM-DD', () => {
  assert.equal(parseDay('2026-11-03')?.toISOString(), '2026-11-03T00:00:00.000Z');
  assert.equal(parseDay('2026-02-30'), null);
  assert.equal(parseDay('3/11/2026'), null);
  assert.equal(parseDay('2026-11-03T10:00'), null);
});

test('el dia del evento se calcula en la zona horaria de quien consulta', () => {
  const lateNightInMexico = new Date('2026-11-04T04:30:00Z'); // 3 nov, 22:30 en Ciudad de Mexico
  assert.equal(localDay(lateNightInMexico, 'America/Mexico_City'), '2026-11-03');
  assert.equal(localDay(lateNightInMexico, 'UTC'), '2026-11-04');
  assert.equal(safeTimeZone('Zona/Inventada'), 'UTC');
  assert.equal(safeTimeZone(undefined), 'UTC');
  assert.equal(safeTimeZone('America/Bogota'), 'America/Bogota');
});

test('dos eventos chocan si se pisan; sin hora de fin se cuentan 2 horas', () => {
  const at = (hour: number) => new Date(Date.UTC(2026, 10, 3, hour));
  const morning = eventWindow({ startsAt: at(10), endsAt: null });
  assert.ok(windowsOverlap(morning, eventWindow({ startsAt: at(11), endsAt: at(13) })));
  assert.ok(!windowsOverlap(morning, eventWindow({ startsAt: at(12), endsAt: null })), 'empezar justo cuando el otro termina no es choque');
  assert.ok(!windowsOverlap(morning, eventWindow({ startsAt: at(18), endsAt: at(20) })));
});

test('un rango bloqueado: fin no anterior al inicio, maximo un año, nota opcional', () => {
  assert.deepEqual(createUnavailabilitySchema.parse({ startsOn: '2026-11-03', endsOn: '2026-11-03', note: '  ' }), { startsOn: '2026-11-03', endsOn: '2026-11-03', note: null });
  assert.equal(createUnavailabilitySchema.safeParse({ startsOn: '2026-11-05', endsOn: '2026-11-03' }).error?.issues[0]?.message, 'La fecha de fin no puede ser anterior a la de inicio');
  assert.equal(createUnavailabilitySchema.safeParse({ startsOn: '2026-01-01', endsOn: '2027-01-02' }).error?.issues[0]?.message, 'Un rango puede durar como maximo un año');
  assert.ok(createUnavailabilitySchema.safeParse({ startsOn: '2026-01-01', endsOn: '2026-12-31' }).success);
  assert.ok(!createUnavailabilitySchema.safeParse({ startsOn: '2026-11-03' }).success);
});

test('para un rol: solo quien lo toca, primero quien lo tiene como principal', () => {
  const ranked = rankForRole(
    [
      { name: 'Beto', instruments: [{ instrument: 'BASS' as const, isPrimary: false }] },
      { name: 'Ana', instruments: [{ instrument: 'BASS' as const, isPrimary: false }] },
      { name: 'Ceci', instruments: [{ instrument: 'BASS' as const, isPrimary: true }] },
      { name: 'Dani', instruments: [{ instrument: 'DRUMS' as const, isPrimary: true }] },
    ],
    'BASS',
  );
  assert.deepEqual(
    ranked.map((entry) => [entry.member.name, entry.isPrimary]),
    [
      ['Ceci', true],
      ['Ana', false],
      ['Beto', false],
    ],
  );
});
