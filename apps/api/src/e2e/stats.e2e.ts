/**
 * Pruebas e2e de Estadisticas: el repertorio lo ve cualquier miembro, la carga por musico solo quien arma equipos;
 * cada organizacion ve solo lo suyo y las notas de disponibilidad nunca salen.
 */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { config } from 'dotenv';
import { seedOrganization, type SeededOrg } from './seed';
import { getTestDatabaseUrl, MISSING_TEST_DATABASE_MESSAGE } from './test-database';
import { startTestApp, type TestApp } from './test-app';

config({ path: resolve(__dirname, '../../../../.env'), quiet: true });
const testDatabaseUrl = getTestDatabaseUrl();

type Role = keyof SeededOrg['users'];
const DAY = 86_400_000;
const PRIVATE_NOTE = 'NOTA-PRIVADA de disponibilidad';

if (!testDatabaseUrl) {
  test('estadisticas (e2e)', { skip: MISSING_TEST_DATABASE_MESSAGE }, () => {});
} else {
  describe('estadisticas de repertorio y carga por musico: API real contra la base de pruebas', () => {
    let api: TestApp;
    let org: SeededOrg;
    let other: SeededOrg;

    before(async () => {
      process.env.NOTIFICATION_REMINDERS_INTERVAL_MS = 'off';
      api = await startTestApp(testDatabaseUrl);
      org = await seedOrganization(api.prisma, 'A');
      other = await seedOrganization(api.prisma, 'B');

      for (const o of [org, other]) {
        // Un servicio hecho hace 10 dias con el setlist de la organizacion y el musico confirmado.
        const played = await api.prisma.event.create({ data: { organizationId: o.organizationId, name: 'Hecho', startsAt: new Date(Date.now() - 10 * DAY), status: 'FINISHED', setlistId: o.setlistId } });
        await api.prisma.eventMusician.create({ data: { eventId: played.id, membershipId: o.users.MUSICIAN.membershipId, status: 'CONFIRMED' } });
        // Uno cancelado con el mismo setlist: no cuenta.
        await api.prisma.event.create({ data: { organizationId: o.organizationId, name: 'Cancelado', startsAt: new Date(Date.now() - 5 * DAY), status: 'CANCELLED', setlistId: o.setlistId } });
      }
      await api.prisma.unavailability.create({ data: { userId: org.users.MUSICIAN.userId, startsOn: new Date(Date.now() + 2 * DAY), endsOn: new Date(Date.now() + 3 * DAY), note: PRIVATE_NOTE } });
    });

    after(async () => {
      await api?.app.close();
    });

    async function call(o: SeededOrg, role: Role, path: string, organizationId = o.organizationId) {
      const user = o.users[role];
      const response = await fetch(`${api.baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${api.sign({ userId: user.userId, email: user.email })}`, 'x-organization-id': organizationId },
      });
      const text = await response.text();
      return { status: response.status, text, body: text ? JSON.parse(text) : {} };
    }

    test('repertorio: cualquier miembro lo ve, solo con lo de su organizacion', async () => {
      const stats = await call(org, 'GUEST', '/api/stats/repertoire');
      assert.equal(stats.status, 200);
      assert.equal(stats.body.period.months, 6, '6 meses por defecto');
      assert.equal(stats.body.totals.eventsPlayed, 1, 'el cancelado no cuenta');
      assert.deepEqual(stats.body.topSongs.map((row: { songId: string; timesPlayed: number }) => [row.songId, row.timesPlayed]), [[org.songId, 1]]);
      assert.deepEqual(stats.body.keys, [{ key: 'C', timesPlayed: 1 }]);
      assert.ok(!stats.text.includes('SECRETO-B'));
      assert.ok(!stats.text.includes(other.songId));

      assert.equal((await call(org, 'GUEST', '/api/stats/repertoire?months=12')).body.period.months, 12);
      assert.equal((await call(org, 'GUEST', '/api/stats/repertoire?months=5')).status, 400);
    });

    test('carga por musico: solo quien arma equipos, sin notas privadas ni gente de otra organizacion', async () => {
      for (const role of ['MUSICIAN', 'GUEST'] as const) assert.equal((await call(org, role, '/api/stats/members')).status, 403, role);

      const stats = await call(org, 'LEADER', '/api/stats/members?months=3');
      assert.equal(stats.status, 200);
      assert.equal(stats.body.members.length, 5, 'los 5 miembros activos de A');
      const musician = stats.body.members.find((row: { membershipId: string }) => row.membershipId === org.users.MUSICIAN.membershipId);
      assert.equal(musician.inTeam, 1);
      assert.equal(musician.confirmed, 1);
      assert.ok(musician.lastServiceAt);
      assert.equal(musician.idle, false);
      assert.equal(musician.unavailableDaysNext30, 2);
      assert.ok(!stats.text.includes(PRIVATE_NOTE), 'la nota de disponibilidad nunca sale');
      assert.ok(!stats.text.includes('SECRETO-B'));
      assert.ok(!stats.text.includes('@e2e.test'), 'tampoco correos');
    });

    test('con la organizacion de otro en el header: 403', async () => {
      assert.equal((await call(org, 'OWNER', '/api/stats/repertoire', other.organizationId)).status, 403);
      assert.equal((await call(org, 'OWNER', '/api/stats/members', other.organizationId)).status, 403);
    });
  });
}
