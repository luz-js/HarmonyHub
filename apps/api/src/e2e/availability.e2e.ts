/**
 * Pruebas e2e de disponibilidad: cada persona maneja sus fechas bloqueadas, los lideres solo ven "No disponible"
 * (nunca la nota) y solo de su organizacion, y los choques con otros eventos se avisan sin impedir nada.
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
type Person = { id: string; email: string };
type MemberRow = { membershipId: string; name: string; unavailable: boolean; conflicts: { eventId: string }[] };

const PRIVATE_NOTE = 'NOTA-PRIVADA cirugia del dentista';
const HOUR = 3_600_000;
const day = (date: Date) => date.toISOString().slice(0, 10);

if (!testDatabaseUrl) {
  test('disponibilidad (e2e)', { skip: MISSING_TEST_DATABASE_MESSAGE }, () => {});
} else {
  describe('disponibilidad del musico: API real contra la base de pruebas', () => {
    let api: TestApp;
    let org: SeededOrg;
    let other: SeededOrg;
    let eventStart: Date;

    before(async () => {
      process.env.NOTIFICATION_REMINDERS_INTERVAL_MS = 'off';
      api = await startTestApp(testDatabaseUrl);
      org = await seedOrganization(api.prisma, 'A');
      other = await seedOrganization(api.prisma, 'B');
      eventStart = (await api.prisma.event.findUniqueOrThrow({ where: { id: org.eventId } })).startsAt;
    });

    after(async () => {
      await api?.app.close();
    });

    const person = (o: SeededOrg, role: Role): Person => ({ id: o.users[role].userId, email: o.users[role].email });

    async function call(who: Person, method: string, path: string, options: { organizationId?: string; body?: unknown } = {}) {
      const headers: Record<string, string> = { Authorization: `Bearer ${api.sign({ userId: who.id, email: who.email })}`, 'Content-Type': 'application/json' };
      if (options.organizationId) headers['x-organization-id'] = options.organizationId;
      const response = await fetch(`${api.baseUrl}${path}`, { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
      const text = await response.text();
      return { status: response.status, text, body: text ? JSON.parse(text) : {} };
    }

    const block = (who: Person, startsOn: string, endsOn = startsOn, note?: string) => call(who, 'POST', '/api/me/unavailability', { body: { startsOn, endsOn, note } });
    const memberOf = (rows: MemberRow[], o: SeededOrg, role: Role) => rows.find((row) => row.membershipId === o.users[role].membershipId)!;

    test('Mi perfil: agregar, validar, listar y borrar solo lo propio', async () => {
      const guest = person(org, 'GUEST');
      const created = await block(guest, '2026-12-24', '2026-12-26', 'Viaje');
      assert.equal(created.status, 201);
      assert.deepEqual({ ...created.body, id: undefined, createdAt: undefined }, { id: undefined, startsOn: '2026-12-24', endsOn: '2026-12-26', note: 'Viaje', createdAt: undefined });

      assert.equal((await block(guest, '2026-12-26', '2026-12-24')).status, 400);
      assert.equal((await block(guest, '2026-02-30')).status, 400);

      // Sin organizacion en el header: las fechas son de la persona, no de una organizacion.
      const list = await call(guest, 'GET', '/api/me/unavailability');
      assert.deepEqual(list.body.map((row: { startsOn: string }) => row.startsOn), ['2026-12-24']);

      assert.equal((await call(person(org, 'OWNER'), 'DELETE', `/api/me/unavailability/${created.body.id}`)).status, 404, 'nadie borra fechas ajenas');
      assert.equal((await call(guest, 'DELETE', `/api/me/unavailability/${created.body.id}`)).status, 200);
      assert.deepEqual((await call(guest, 'GET', '/api/me/unavailability')).body, []);
      assert.equal((await call(guest, 'GET', '/api/me/unavailability', {})).status, 200);
    });

    test('los lideres ven "No disponible" de su organizacion, nunca la nota ni a gente de otra organizacion', async () => {
      assert.equal((await block(person(org, 'ADMIN'), day(eventStart), day(eventStart), PRIVATE_NOTE)).status, 201);
      assert.equal((await block(person(other, 'ADMIN'), day(eventStart), day(eventStart), PRIVATE_NOTE)).status, 201);

      const range = `?from=${day(eventStart)}&to=${day(eventStart)}`;
      const leader = await call(person(org, 'LEADER'), 'GET', `/api/availability${range}`, { organizationId: org.organizationId });
      assert.equal(leader.status, 200);
      assert.deepEqual(
        leader.body.items.map((item: { membershipId: string; ranges: unknown[] }) => [item.membershipId, item.ranges]),
        [[org.users.ADMIN.membershipId, [{ startsOn: day(eventStart), endsOn: day(eventStart) }]]],
      );
      assert.ok(!leader.text.includes(PRIVATE_NOTE), 'la nota privada no sale de Mi perfil');
      assert.ok(!leader.text.includes(other.secret), 'no aparece nadie de otra organizacion');

      const forEvent = await call(person(org, 'LEADER'), 'GET', `/api/events/${org.eventId}/availability?tz=UTC`, { organizationId: org.organizationId });
      assert.equal(forEvent.status, 200);
      assert.ok(!forEvent.text.includes(PRIVATE_NOTE));
      assert.ok(!forEvent.text.includes(other.secret));
      assert.equal(memberOf(forEvent.body.members, org, 'ADMIN').unavailable, true);
      assert.equal(memberOf(forEvent.body.members, org, 'GUEST').unavailable, false);

      // Musicos e invitados no consultan la disponibilidad del resto; tampoco con el evento de otra organizacion.
      assert.equal((await call(person(org, 'MUSICIAN'), 'GET', `/api/availability${range}`, { organizationId: org.organizationId })).status, 403);
      assert.equal((await call(person(org, 'GUEST'), 'GET', `/api/events/${org.eventId}/availability`, { organizationId: org.organizationId })).status, 403);
      assert.equal((await call(person(org, 'OWNER'), 'GET', `/api/events/${other.eventId}/availability`, { organizationId: org.organizationId })).status, 404);
      assert.equal((await call(person(org, 'OWNER'), 'GET', `/api/setlists/${other.setlistId}/availability`, { organizationId: org.organizationId })).status, 404);
      assert.equal((await call(person(org, 'OWNER'), 'GET', '/api/availability?from=2026-01-01&to=2026-12-31', { organizationId: org.organizationId })).status, 400);
    });

    test('choques: otro evento a la misma hora avisa; cancelados y "no voy" no cuentan; nunca bloquea', async () => {
      const at = (offset: number) => new Date(eventStart.getTime() + offset * HOUR);
      const create = (name: string, startsAt: Date, status: 'PENDING' | 'CANCELLED' = 'PENDING') =>
        api.prisma.event.create({ data: { organizationId: org.organizationId, name, startsAt, status } });
      const overlapping = await create('Ensayo pegado', at(1));
      const cancelled = await create('Ensayo cancelado', at(0), 'CANCELLED');
      const later = await create('Otro dia', at(30));
      await api.prisma.eventMusician.createMany({
        data: [
          { eventId: overlapping.id, membershipId: org.users.MUSICIAN.membershipId },
          { eventId: overlapping.id, membershipId: org.users.LEADER.membershipId, status: 'DECLINED' },
          { eventId: cancelled.id, membershipId: org.users.GUEST.membershipId },
          { eventId: later.id, membershipId: org.users.OWNER.membershipId },
        ],
      });

      const { body } = await call(person(org, 'LEADER'), 'GET', `/api/events/${org.eventId}/availability?tz=UTC`, { organizationId: org.organizationId });
      assert.deepEqual(memberOf(body.members, org, 'MUSICIAN').conflicts.map((item) => item.eventId), [overlapping.id]);
      for (const role of ['LEADER', 'GUEST', 'OWNER'] as const) assert.deepEqual(memberOf(body.members, org, role).conflicts, [], role);

      // Avisar no es impedir: alguien no disponible igual se puede sumar al equipo.
      const added = await call(person(org, 'LEADER'), 'POST', `/api/events/${org.eventId}/musicians`, {
        organizationId: org.organizationId,
        body: { membershipId: org.users.ADMIN.membershipId },
      });
      assert.equal(added.status, 201);
    });

    test('sugerencias para un rol: quien lo toca y esta libre, primero el instrumento principal', async () => {
      await api.prisma.userInstrument.createMany({
        data: [
          { userId: org.users.GUEST.userId, instrument: 'BASS', isPrimary: false },
          { userId: org.users.OWNER.userId, instrument: 'BASS', isPrimary: true },
          { userId: org.users.ADMIN.userId, instrument: 'BASS', isPrimary: true }, // no disponible ese dia
          { userId: org.users.MUSICIAN.userId, instrument: 'BASS', isPrimary: true }, // tiene otro evento a esa hora
        ],
      });
      const { body } = await call(person(org, 'LEADER'), 'GET', `/api/events/${org.eventId}/availability?tz=UTC&role=BASS`, { organizationId: org.organizationId });
      assert.deepEqual(
        body.suggestions.map((item: { membershipId: string; isPrimary: boolean }) => [item.membershipId, item.isPrimary]),
        [
          [org.users.OWNER.membershipId, true],
          [org.users.GUEST.membershipId, false],
        ],
      );
      assert.equal((await call(person(org, 'LEADER'), 'GET', `/api/events/${org.eventId}/availability?role=GUITARRA`, { organizationId: org.organizationId })).status, 400);
    });

    test('un setlist usa su proximo evento; sin evento no hay nada que avisar', async () => {
      const path = `/api/setlists/${org.setlistId}/availability?tz=UTC`;
      const before = await call(person(org, 'LEADER'), 'GET', path, { organizationId: org.organizationId });
      assert.deepEqual(before.body, { event: null, members: [], suggestions: [] });

      await api.prisma.event.update({ where: { id: org.eventId }, data: { setlistId: org.setlistId } });
      const linked = await call(person(org, 'LEADER'), 'GET', path, { organizationId: org.organizationId });
      assert.equal(linked.body.event.id, org.eventId);
      assert.equal(memberOf(linked.body.members, org, 'ADMIN').unavailable, true);
      assert.ok(!linked.text.includes(PRIVATE_NOTE));
    });
  });
}
