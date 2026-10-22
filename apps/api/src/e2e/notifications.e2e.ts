/**
 * Pruebas e2e de avisos y recordatorios: se crean en los casos claros, nunca para quien hizo la accion, los
 * recordatorios no se repiten (ni con dos revisiones a la vez) y cada persona solo ve y marca los suyos.
 */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { config } from 'dotenv';
import type { NotificationsService } from '../notifications/notifications.service';
import { seedOrganization, type SeededOrg } from './seed';
import { getTestDatabaseUrl, MISSING_TEST_DATABASE_MESSAGE } from './test-database';
import { startTestApp, type TestApp } from './test-app';

config({ path: resolve(__dirname, '../../../../.env'), quiet: true });
const testDatabaseUrl = getTestDatabaseUrl();

type Role = keyof SeededOrg['users'];
type Person = { id: string; email: string };

if (!testDatabaseUrl) {
  test('avisos y recordatorios (e2e)', { skip: MISSING_TEST_DATABASE_MESSAGE }, () => {});
} else {
  describe('avisos dentro de la app y recordatorios de eventos: API real contra la base de pruebas', () => {
    let api: TestApp;
    let org: SeededOrg;
    let other: SeededOrg;
    let notifications: NotificationsService;

    before(async () => {
      process.env.NOTIFICATION_REMINDERS_INTERVAL_MS = 'off';
      api = await startTestApp(testDatabaseUrl);
      org = await seedOrganization(api.prisma, 'A');
      other = await seedOrganization(api.prisma, 'B');
      const { NotificationsService: Service } = await import('../notifications/notifications.service');
      notifications = api.app.get(Service);
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
      return { status: response.status, body: text ? JSON.parse(text) : {} };
    }

    const typesOf = async (who: Person, type?: string) =>
      (await api.prisma.notification.findMany({ where: { userId: who.id, ...(type ? { type: type as never } : {}) } })).map((row) => row.type);

    test('sumar a alguien al equipo de un evento le avisa a esa persona, nunca a quien lo sumo', async () => {
      const result = await call(person(org, 'LEADER'), 'POST', `/api/events/${org.eventId}/musicians`, {
        organizationId: org.organizationId,
        body: { membershipId: org.users.GUEST.membershipId },
      });
      assert.equal(result.status, 201);
      assert.deepEqual(await typesOf(person(org, 'GUEST'), 'EVENT_TEAM_ADDED'), ['EVENT_TEAM_ADDED']);
      assert.deepEqual(await typesOf(person(org, 'LEADER')), []);
    });

    test('cambiar de fecha o cancelar un evento avisa a su equipo (una sola vez por cambio)', async () => {
      const event = await api.prisma.event.create({
        data: { organizationId: org.organizationId, name: 'Ensayo general', status: 'PENDING', startsAt: new Date(Date.now() + 10 * 86_400_000) },
      });
      await api.prisma.eventMusician.create({ data: { eventId: event.id, membershipId: org.users.MUSICIAN.membershipId } });
      const owner = person(org, 'OWNER');
      const newDate = new Date(Date.now() + 12 * 86_400_000).toISOString();
      for (let attempt = 0; attempt < 2; attempt += 1) {
        await call(owner, 'PATCH', `/api/events/${event.id}`, { organizationId: org.organizationId, body: { startsAt: newDate } });
      }
      assert.deepEqual(await typesOf(person(org, 'MUSICIAN'), 'EVENT_RESCHEDULED'), ['EVENT_RESCHEDULED']);

      assert.equal((await call(owner, 'PATCH', `/api/events/${event.id}`, { organizationId: org.organizationId, body: { status: 'CANCELLED' } })).status, 200);
      const [cancelled] = await api.prisma.notification.findMany({ where: { userId: org.users.MUSICIAN.userId, type: 'EVENT_CANCELLED' } });
      assert.equal(cancelled.title, 'Se canceló Ensayo general');
      assert.equal(cancelled.link, `/events/${event.id}`);
    });

    test('setlists: sumar participante, asignar y publicar avisan a quienes corresponde', async () => {
      const owner = person(org, 'OWNER');
      const added = await call(owner, 'POST', `/api/setlists/${org.setlistId}/participants`, { organizationId: org.organizationId, body: { membershipId: org.users.GUEST.membershipId } });
      assert.equal(added.status, 201);
      assert.deepEqual(await typesOf(person(org, 'GUEST'), 'SETLIST_PARTICIPANT_ADDED'), ['SETLIST_PARTICIPANT_ADDED']);

      const assigned = await call(owner, 'POST', `/api/setlists/${org.setlistId}/items/${org.itemId}/assignments`, {
        organizationId: org.organizationId,
        body: { participantId: added.body.id, role: 'KEYS' },
      });
      assert.equal(assigned.status, 201);
      assert.deepEqual(await typesOf(person(org, 'GUEST'), 'SETLIST_ASSIGNMENT_ADDED'), ['SETLIST_ASSIGNMENT_ADDED']);

      // El ciclo es DRAFT -> READY -> PUBLISHED: se deja listo antes de publicar.
      await api.prisma.setlist.update({ where: { id: org.setlistId }, data: { status: 'READY' } });
      const published = await call(owner, 'POST', `/api/setlists/${org.setlistId}/publish`, { organizationId: org.organizationId });
      assert.equal(published.status, 201, JSON.stringify(published.body));
      for (const role of ['MUSICIAN', 'GUEST'] as const) assert.deepEqual(await typesOf(person(org, role), 'SETLIST_PUBLISHED'), ['SETLIST_PUBLISHED'], role);
      assert.deepEqual(await typesOf(owner, 'SETLIST_PUBLISHED'), []);
    });

    test('una invitacion avisa a la persona (aunque no tenga organizacion) y al responderla queda leida', async () => {
      const guest = await api.prisma.user.create({ data: { name: 'Nueva', email: 'nueva-aviso@correo.com', passwordHash: 'e2e-sin-login' }, select: { id: true, email: true } });
      const invitation = await call(person(org, 'OWNER'), 'POST', '/api/invitations', {
        organizationId: org.organizationId,
        body: { organizationId: org.organizationId, email: guest.email, role: 'MUSICIAN' },
      });
      assert.equal(invitation.status, 201);

      const inbox = await call(guest, 'GET', '/api/notifications');
      assert.equal(inbox.status, 200);
      assert.equal(inbox.body.items.length, 1);
      assert.equal(inbox.body.items[0].type, 'INVITATION_RECEIVED');
      assert.equal(inbox.body.items[0].link, '/invitations');
      assert.equal((await call(guest, 'GET', '/api/notifications/unread-count')).body.unread, 1);

      await call(guest, 'POST', `/api/me/invitations/${invitation.body.id}/accept`);
      assert.equal((await call(guest, 'GET', '/api/notifications/unread-count')).body.unread, 0);
    });

    test('recordatorios: solo eventos en las proximas 24 h sin confirmar, y nunca repetidos (ni con dos revisiones a la vez)', async () => {
      const soon = await api.prisma.event.create({ data: { organizationId: org.organizationId, name: 'Culto de manana', status: 'CONFIRMED', startsAt: new Date(Date.now() + 2 * 3_600_000) } });
      const later = await api.prisma.event.create({ data: { organizationId: org.organizationId, name: 'Concierto lejano', status: 'CONFIRMED', startsAt: new Date(Date.now() + 3 * 86_400_000) } });
      const draft = await api.prisma.event.create({ data: { organizationId: org.organizationId, name: 'Borrador', status: 'DRAFT', startsAt: new Date(Date.now() + 3_600_000) } });
      await api.prisma.eventMusician.create({ data: { eventId: soon.id, membershipId: org.users.MUSICIAN.membershipId } });
      await api.prisma.eventMusician.create({ data: { eventId: soon.id, membershipId: org.users.LEADER.membershipId, status: 'CONFIRMED' } });
      await api.prisma.eventMusician.create({ data: { eventId: later.id, membershipId: org.users.MUSICIAN.membershipId } });
      await api.prisma.eventMusician.create({ data: { eventId: draft.id, membershipId: org.users.MUSICIAN.membershipId } });

      await Promise.all([notifications.sendDueEventReminders(), notifications.sendDueEventReminders()]);
      await notifications.sendDueEventReminders();

      const reminders = await api.prisma.notification.findMany({ where: { type: 'EVENT_REMINDER' } });
      assert.equal(reminders.length, 1);
      assert.equal(reminders[0].userId, org.users.MUSICIAN.userId);
      assert.equal(reminders[0].link, `/events/${soon.id}`);
    });

    test('la bandeja: solo lo propio y de la organizacion activa; paginada; marcar uno y todos', async () => {
      const musician = person(org, 'MUSICIAN');
      const first = await call(musician, 'GET', '/api/notifications?limit=2', { organizationId: org.organizationId });
      assert.equal(first.status, 200);
      assert.equal(first.body.items.length, 2);
      assert.ok(first.body.nextCursor);
      const second = await call(musician, 'GET', `/api/notifications?limit=2&cursor=${first.body.nextCursor}`, { organizationId: org.organizationId });
      assert.ok(second.body.items.length >= 1);
      assert.ok(!second.body.items.some((item: { id: string }) => first.body.items.some((seen: { id: string }) => seen.id === item.id)));

      // Con el header de otra organizacion (donde no es miembro) no ve nada de A ni de B.
      const foreign = await call(musician, 'GET', '/api/notifications', { organizationId: other.organizationId });
      assert.equal(foreign.body.items.length, 0);

      const id = first.body.items[0].id;
      assert.equal((await call(person(other, 'OWNER'), 'PATCH', `/api/notifications/${id}/read`)).status, 404);
      assert.equal((await call(person(org, 'GUEST'), 'PATCH', `/api/notifications/${id}/read`)).status, 404);
      const read = await call(musician, 'PATCH', `/api/notifications/${id}/read`);
      assert.equal(read.status, 200);
      assert.ok(read.body.readAt);

      const all = await call(musician, 'POST', '/api/notifications/read-all', { organizationId: org.organizationId });
      assert.equal(all.status, 200);
      assert.equal((await call(musician, 'GET', '/api/notifications/unread-count', { organizationId: org.organizationId })).body.unread, 0);
      assert.equal((await call(musician, 'GET', '/api/notifications')).status, 200);
      assert.equal((await fetch(`${api.baseUrl}/api/notifications`)).status, 401);
    });
  });
}
