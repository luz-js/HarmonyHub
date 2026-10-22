import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCalendar, escapeText, eventUid, foldLine, formatUtc, icsFileName, icsStatus, sequenceOf, type IcsEvent } from './ical';

const event: IcsEvent = {
  id: 'evt1',
  name: 'Culto de domingo, mañana',
  startsAt: new Date('2026-11-08T14:00:00.000Z'),
  endsAt: new Date('2026-11-08T16:30:00.000Z'),
  location: 'Templo central; salón 2',
  description: 'Llegar 30 min antes\nTraer cables',
  status: 'CONFIRMED',
  setlistName: 'Domingo 8',
  createdAt: new Date('2026-10-01T10:00:00.000Z'),
  updatedAt: new Date('2026-10-20T12:34:56.000Z'),
};
const now = new Date('2026-10-22T09:00:00.000Z');

/** Deshace el plegado (RFC 5545 3.1) para revisar las lineas completas. */
const unfold = (ics: string) => ics.replace(/\r\n /g, '').split('\r\n');

test('formatUtc usa el formato basico UTC con Z', () => {
  assert.equal(formatUtc(new Date('2026-11-03T19:30:05.123Z')), '20261103T193005Z');
});

test('escapeText escapa barra invertida, punto y coma, coma y saltos de linea', () => {
  assert.equal(escapeText('a\\b;c,d\ne\r\nf'), 'a\\\\b\\;c\\,d\\ne\\nf');
});

test('foldLine corta en 75 bytes sin partir letras con tilde', () => {
  const line = `DESCRIPTION:${'ñ'.repeat(80)}`;
  const folded = foldLine(line);
  for (const part of folded.split('\r\n')) assert.ok(Buffer.byteLength(part, 'utf8') <= 75);
  assert.equal(folded.replace(/\r\n /g, ''), line);
  assert.equal(foldLine('corta'), 'corta');
});

test('icsStatus: cancelado, confirmado/terminado y el resto tentativo', () => {
  assert.equal(icsStatus('CANCELLED'), 'CANCELLED');
  assert.equal(icsStatus('CONFIRMED'), 'CONFIRMED');
  assert.equal(icsStatus('FINISHED'), 'CONFIRMED');
  assert.equal(icsStatus('DRAFT'), 'TENTATIVE');
  assert.equal(icsStatus('PENDING'), 'TENTATIVE');
});

test('sequenceOf crece cuando el evento cambia', () => {
  assert.ok(sequenceOf(new Date('2026-10-20T12:40:00Z')) > sequenceOf(event.updatedAt));
  assert.equal(sequenceOf(new Date('2019-01-01T00:00:00Z')), 0);
});

test('buildCalendar arma un VCALENDAR valido con CRLF y un VEVENT completo', () => {
  const ics = buildCalendar({ name: 'Culto', events: [event], now });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.ok(!/[^\r]\n/.test(ics), 'todas las lineas terminan en CRLF');
  const lines = unfold(ics);
  for (const expected of [
    'METHOD:PUBLISH',
    `UID:${eventUid('evt1')}`,
    'DTSTAMP:20261022T090000Z',
    'DTSTART:20261108T140000Z',
    'DTEND:20261108T163000Z',
    'SUMMARY:Culto de domingo\\, mañana',
    'LOCATION:Templo central\\; salón 2',
    'DESCRIPTION:Llegar 30 min antes\\nTraer cables\\n\\nSetlist: Domingo 8',
    'STATUS:CONFIRMED',
    'CREATED:20261001T100000Z',
    'LAST-MODIFIED:20261020T123456Z',
  ]) {
    assert.ok(lines.includes(expected), `falta ${expected}`);
  }
});

test('buildCalendar: sin hora de fin dura 2 horas y sin lugar ni descripcion no salen esos campos', () => {
  const lines = unfold(buildCalendar({ name: 'x', events: [{ ...event, endsAt: null, location: ' ', description: null, setlistName: null }], now }));
  assert.ok(lines.includes('DTEND:20261108T160000Z'));
  assert.ok(!lines.some((line) => line.startsWith('LOCATION:') || line.startsWith('DESCRIPTION:')));
});

test('buildCalendar con varios eventos y con ninguno', () => {
  const two = buildCalendar({ name: 'x', events: [event, { ...event, id: 'evt2' }], now });
  assert.equal(two.match(/BEGIN:VEVENT/g)?.length, 2);
  assert.equal(buildCalendar({ name: 'x', events: [], now }).includes('BEGIN:VEVENT'), false);
});

test('icsFileName quita tildes y simbolos', () => {
  assert.equal(icsFileName('Culto de Domingo, ¡mañana!'), 'culto-de-domingo-manana.ics');
  assert.equal(icsFileName('¡¡!!'), 'evento.ics');
  assert.equal(icsFileName('', 'mis-eventos'), 'mis-eventos.ics');
});
