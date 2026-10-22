/**
 * Pruebas e2e de exportar a calendario (.ics): un evento para cualquier miembro con lectura, solo de su organizacion,
 * y "mis proximos eventos" con solo los eventos donde estoy en el equipo (sin cancelados ni los que rechace).
 */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { config } from 'dotenv';
import { eventUid } from '../events/calendar/ical';
import { seedOrganization, type SeededOrg } from './seed';
import { getTestDatabaseUrl, MISSING_TEST_DATABASE_MESSAGE } from './test-database';
import { startTestApp, type TestApp } from './test-app';

config({ path: resolve(__dirname, '../../../../.env'), quiet: true });
const testDatabaseUrl = getTestDatabaseUrl();

type Role = keyof SeededOrg['users'];
const DAY = 86_400_000;
const unfold = (ics: string) => ics.replace(/\r\n /g, '');

if (!testDatabaseUrl) {
  test('calendario .ics (e2e)', { skip: MISSING_TEST_DATABASE_MESSAGE }, () => {});
} else {
  describe('exportar eventos a calendario (.ics): API real contra la base de pruebas', () => {
    let api: TestApp;
    let org: SeededOrg;
    let other: SeededOrg;

    before(async () => {
      process.env.NOTIFICATION_REMINDERS_INTERVAL_MS = 'off';
      api = await startTestApp(testDatabaseUrl);
      org = await seedOrganization(api.prisma, 'A');
      other = await seedOrganization(api.prisma, 'B');
    });

    after(async () => {
      await api?.app.close();
    });

    async function download(o: SeededOrg, role: Role, path: string, organizationId = o.organizationId) {
      const user = o.users[role];
      const response = await fetch(`${api.baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${api.sign({ userId: user.userId, email: user.email })}`, 'x-organization-id': organizationId },
      });
      return { status: response.status, type: response.headers.get('content-type'), disposition: response.headers.get('content-disposition'), text: await response.text() };
    }

    test('un evento: cualquier miembro lo descarga como .ics con UID estable', async () => {
      const result = await download(org, 'GUEST', `/api/events/${org.eventId}/ical`);
      assert.equal(result.status, 200);
      assert.match(result.type ?? '', /^text\/calendar/);
      assert.equal(result.disposition, 'attachment; filename="evento-secreto-a.ics"');
      const ics = unfold(result.text);
      assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
      assert.ok(ics.includes(`UID:${eventUid(org.eventId)}\r\n`));
      assert.ok(ics.includes('SUMMARY:Evento SECRETO-A\r\n'));
      assert.ok(ics.includes('STATUS:TENTATIVE\r\n'), 'un borrador sale como tentativo');
      assert.ok(!result.text.includes('SECRETO-B'));

      const again = await download(org, 'OWNER', `/api/events/${org.eventId}/ical`);
      assert.ok(unfold(again.text).includes(`UID:${eventUid(org.eventId)}\r\n`), 'mismo UID en cada descarga');
    });

    test('un evento de otra organizacion no se puede descargar', async () => {
      assert.equal((await download(org, 'OWNER', `/api/events/${other.eventId}/ical`)).status, 404);
      assert.equal((await download(org, 'OWNER', `/api/events/${org.eventId}/ical`, other.organizationId)).status, 403);
      assert.equal((await download(org, 'OWNER', '/api/events/no-existe/ical')).status, 404);
    });

    test('mis proximos eventos: solo donde estoy en el equipo, sin cancelados, rechazados ni pasados', async () => {
      const musician = org.users.MUSICIAN.membershipId;
      const make = (name: string, startsAt: Date, status: 'DRAFT' | 'CANCELLED' = 'DRAFT', musicianStatus?: 'DECLINED') =>
        api.prisma.event.create({
          data: { organizationId: org.organizationId, name, startsAt, status, musicians: { create: { membershipId: musician, ...(musicianStatus ? { status: musicianStatus } : {}) } } },
        });
      const cancelled = await make('Cancelado', new Date(Date.now() + 3 * DAY), 'CANCELLED');
      const declined = await make('Rechazado', new Date(Date.now() + 4 * DAY), 'DRAFT', 'DECLINED');
      const past = await make('Pasado', new Date(Date.now() - 10 * DAY));

      const mine = await download(org, 'MUSICIAN', '/api/calendar/my-events.ics');
      assert.equal(mine.status, 200);
      assert.match(mine.type ?? '', /^text\/calendar/);
      assert.match(mine.disposition ?? '', /^attachment; filename="mis-eventos-org-a-secreto-a\.ics"$/);
      const ics = unfold(mine.text);
      assert.ok(ics.includes(`UID:${eventUid(org.eventId)}\r\n`));
      for (const hidden of [cancelled, declined, past]) assert.ok(!ics.includes(eventUid(hidden.id)), `no deberia salir ${hidden.name}`);
      assert.equal(ics.match(/BEGIN:VEVENT/g)?.length, 1);

      // El dueño no esta en el equipo de ningun evento: calendario vacio pero valido.
      const owner = await download(org, 'OWNER', '/api/calendar/my-events.ics');
      assert.equal(owner.status, 200);
      assert.ok(!owner.text.includes('BEGIN:VEVENT'));
      assert.ok(owner.text.endsWith('END:VCALENDAR\r\n'));
    });

    test('un evento cancelado se puede bajar uno por uno y sale como cancelado', async () => {
      const event = await api.prisma.event.create({ data: { organizationId: org.organizationId, name: 'Suspendido', startsAt: new Date(Date.now() + 5 * DAY), status: 'CANCELLED' } });
      const result = await download(org, 'GUEST', `/api/events/${event.id}/ical`);
      assert.equal(result.status, 200);
      assert.ok(result.text.includes('STATUS:CANCELLED\r\n'));
    });
  });
}
