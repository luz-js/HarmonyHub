/**
 * Pruebas e2e de permisos entre organizaciones: levantan la API real (AppModule, guards reales) contra una
 * base de pruebas SEPARADA (TEST_DATABASE_URL) y comprueban que nadie lee ni modifica datos de otra organizacion.
 * Correr con: npm run test:e2e -w @harmonyhub/api  (sin TEST_DATABASE_URL se omiten con un aviso).
 */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { after, before, describe, test } from 'node:test';
import type { INestApplication } from '@nestjs/common';
import { config } from 'dotenv';
import type { PrismaService as PrismaServiceType } from '../prisma/prisma.service';
import { listRoutes, type CatalogRoute } from '../permissions/route-catalog';
import { getTestDatabaseUrl, MISSING_TEST_DATABASE_MESSAGE } from './test-database';
import { seedOrganization, snapshotOrganization, type SeededOrg } from './seed';
import { startTestApp } from './test-app';

config({ path: resolve(__dirname, '../../../../.env'), quiet: true });
const testDatabaseUrl = getTestDatabaseUrl();

type Actor = { userId: string; email: string };
type CallOptions = { organizationId?: string; body?: unknown };

if (!testDatabaseUrl) {
  test('permisos entre organizaciones (e2e)', { skip: MISSING_TEST_DATABASE_MESSAGE }, () => {});
} else {
  describe('permisos entre organizaciones: API real contra la base de pruebas', () => {
    let app: INestApplication;
    let prisma: PrismaServiceType;
    let baseUrl = '';
    let sign: (actor: Actor) => string;
    let orgA: SeededOrg;
    let orgB: SeededOrg;
    let outsider: Actor;
    let snapshotB: unknown;
    const routes = listRoutes();

    before(async () => {
      ({ app, prisma, baseUrl, sign } = await startTestApp(testDatabaseUrl));
      orgA = await seedOrganization(prisma, 'A');
      orgB = await seedOrganization(prisma, 'B');
      const user = await prisma.user.create({ data: { name: 'Persona sin organizacion', email: 'outsider@e2e.test', passwordHash: 'e2e-sin-login' } });
      outsider = { userId: user.id, email: user.email };
      snapshotB = await snapshotOrganization(prisma, orgB.organizationId);
    });

    after(async () => {
      await app?.close();
    });

    async function call(actor: Actor, method: string, path: string, options: CallOptions = {}) {
      const headers: Record<string, string> = { Authorization: `Bearer ${sign(actor)}`, 'Content-Type': 'application/json' };
      if (options.organizationId) headers['x-organization-id'] = options.organizationId;
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: method === 'GET' || method === 'DELETE' ? undefined : JSON.stringify(options.body ?? {}),
      });
      return { status: response.status, text: await response.text() };
    }

    const as = (org: SeededOrg, role: keyof SeededOrg['users']): Actor => ({ userId: org.users[role].userId, email: org.users[role].email });

    /** Reemplaza los :parametros de una ruta con ids reales de la organizacion indicada. */
    function fillPath(path: string, org: SeededOrg) {
      const idByResource: Record<string, string> = {
        songs: org.songId,
        setlists: org.setlistId,
        events: org.eventId,
        organizations: org.organizationId,
        memberships: org.users.MUSICIAN.membershipId,
        invitations: org.invitationId,
      };
      const resource = path.split('/')[2];
      return path.replace(/:(\w+)/g, (_match, param: string) => {
        const value =
          param === 'id' ? idByResource[resource]
          : param === 'musicianId' ? org.eventMusicianId
          : param === 'token' ? org.invitationToken
          : param === 'revisionNumber' ? '1'
          : (org as unknown as Record<string, string>)[param];
        assert.ok(value, `no hay id de prueba para :${param} en ${path}`);
        return value;
      });
    }

    const labeled = () => routes.filter((route): route is CatalogRoute & { requirement: NonNullable<CatalogRoute['requirement']> } => Boolean(route.requirement));
    const describeRoute = (route: CatalogRoute, path: string) => `${route.method} ${path} (${route.controller}.${route.handler})`;

    test('con la organizacion B (header, parametro o cuerpo), un miembro de A recibe 403 en toda ruta de organizacion', async () => {
      const failures: string[] = [];
      for (const route of labeled()) {
        const path = fillPath(route.path, orgB);
        const { status } = await call(as(orgA, 'OWNER'), route.method, path, { organizationId: orgB.organizationId, body: { organizationId: orgB.organizationId } });
        if (status !== 403) failures.push(`${describeRoute(route, path)} -> ${status}`);
      }
      assert.deepEqual(failures, [], `Rutas que no respondieron 403:\n${failures.join('\n')}`);
    });

    test('con su organizacion en el header pero ids de B, nunca responde 2xx ni devuelve datos de B', async () => {
      const failures: string[] = [];
      const checked = labeled().filter((route) => route.path.includes(':') && typeof route.requirement.organizationFrom === 'string');
      assert.ok(checked.length > 80, `se esperaban mas rutas con ids (${checked.length})`);
      for (const route of checked) {
        const path = fillPath(route.path, orgB);
        const { status, text } = await call(as(orgA, 'OWNER'), route.method, path, { organizationId: orgA.organizationId });
        if (![400, 403, 404].includes(status) || text.includes(orgB.secret)) {
          failures.push(`${describeRoute(route, path)} -> ${status}${text.includes(orgB.secret) ? ' (incluye datos de B)' : ''}`);
        }
      }
      assert.deepEqual(failures, [], `Posibles fugas entre organizaciones:\n${failures.join('\n')}`);
    });

    test('las listas de A responden 200 y no incluyen nada de B', async () => {
      const failures: string[] = [];
      const lists = labeled().filter((route) => route.method === 'GET' && !route.path.includes(':'));
      assert.ok(lists.length >= 6);
      for (const route of lists) {
        // Aunque llegue ?organizationId=B, manda el header (la organizacion activa).
        const path = `${route.path}?organizationId=${orgB.organizationId}`;
        const { status, text } = await call(as(orgA, 'OWNER'), 'GET', path, { organizationId: orgA.organizationId });
        if (status !== 200 || text.includes(orgB.secret) || !text.includes(orgA.secret) && /songs|setlists|events|memberships|files/.test(route.path)) {
          failures.push(`${route.method} ${path} -> ${status}`);
        }
      }
      assert.deepEqual(failures, [], failures.join('\n'));
    });

    test('la pagina Archivos solo lista archivos de la propia organizacion, aunque se busque lo de B', async () => {
      const { status, text } = await call(as(orgA, 'MUSICIAN'), 'GET', `/api/files?search=${encodeURIComponent(orgB.secret)}`, { organizationId: orgA.organizationId });
      assert.equal(status, 200);
      assert.deepEqual(JSON.parse(text), { items: [] });
      const own = JSON.parse((await call(as(orgA, 'GUEST'), 'GET', '/api/files', { organizationId: orgA.organizationId })).text);
      assert.deepEqual(own.items.map((item: { song: { id: string } }) => item.song.id), [orgA.songId]);
    });

    test('las referencias a datos de B dentro del cuerpo se rechazan', async () => {
      const owner = as(orgA, 'OWNER');
      const org = { organizationId: orgA.organizationId };
      const cases: [string, string, unknown][] = [
        ['POST', `/api/setlists/${orgA.setlistId}/participants`, { membershipId: orgB.users.MUSICIAN.membershipId }],
        ['POST', `/api/events/${orgA.eventId}/musicians`, { membershipId: orgB.users.MUSICIAN.membershipId }],
        ['POST', '/api/events', { name: 'Evento con setlist ajeno', startsAt: new Date().toISOString(), setlistId: orgB.setlistId }],
        ['PATCH', `/api/events/${orgA.eventId}`, { setlistId: orgB.setlistId }],
        ['POST', `/api/setlists/${orgA.setlistId}/items/${orgA.itemId}/assignments`, { participantId: orgB.participantId, role: 'BASS' }],
        ['POST', `/api/setlists/${orgA.setlistId}/cues`, { type: 'COUNT_IN', title: 'Cue ajeno', responsibleParticipantId: orgB.participantId }],
        ['POST', `/api/setlists/${orgA.setlistId}/items`, { type: 'SONG', title: 'Cancion ajena', songId: orgB.songId, songVersionId: orgB.versionId }],
        ['POST', `/api/songs/${orgA.songId}/tracks/copy`, { sourceVersionId: orgB.versionId, targetVersionId: orgA.versionId }],
        ['POST', `/api/songs/${orgA.songId}/links`, { url: 'https://example.com/x', versionId: orgB.versionId }],
      ];
      const failures: string[] = [];
      for (const [method, path, body] of cases) {
        const { status, text } = await call(owner, method, path, { ...org, body });
        if (status < 400 || status >= 500 || text.includes(orgB.secret)) failures.push(`${method} ${path} -> ${status}`);
      }
      assert.deepEqual(failures, [], `Referencias a B aceptadas:\n${failures.join('\n')}`);

      // Mencionar a alguien de B en un hilo de A no debe guardar la mencion.
      await call(owner, 'POST', `/api/songs/${orgA.songId}/threads`, { ...org, body: { content: 'Hola', mentionedUserIds: [orgB.users.OWNER.userId] } });
      const leakedMentions = await prisma.songCommentMention.count({ where: { userId: orgB.users.OWNER.userId } });
      assert.equal(leakedMentions, 0, 'se guardo una mencion a un usuario de otra organizacion');
    });

    test('las rutas exentas tambien protegen a B (la organizacion sale del registro)', async () => {
      const owner = as(orgA, 'OWNER');
      const org = { organizationId: orgA.organizationId };
      assert.equal((await call(owner, 'PATCH', `/api/memberships/${orgB.users.MUSICIAN.membershipId}`, { ...org, body: { role: 'GUEST' } })).status, 403);
      assert.equal((await call(owner, 'PATCH', `/api/invitations/${orgB.invitationId}/cancel`, org)).status, 403);
      assert.equal((await call(owner, 'POST', `/api/invitations/${orgB.invitationToken}/accept`, org)).status, 403);
    });

    test('alguien sin membresia no entra a A', async () => {
      const org = { organizationId: orgA.organizationId };
      assert.equal((await call(outsider, 'GET', '/api/events', org)).status, 403);
      assert.equal((await call(outsider, 'GET', `/api/songs/${orgA.songId}`, org)).status, 403);
      assert.equal((await call(outsider, 'GET', `/api/organizations/${orgA.organizationId}`)).status, 403);
      assert.equal((await call(outsider, 'GET', '/api/events')).status, 400);
    });

    test('muestra de la matriz de roles dentro de A', async () => {
      const org = { organizationId: orgA.organizationId };
      const leader = as(orgA, 'LEADER');
      const musician = as(orgA, 'MUSICIAN');
      const guest = as(orgA, 'GUEST');
      const admin = as(orgA, 'ADMIN');
      const expectStatus = async (actor: Actor, method: string, path: string, expected: number | 'ok', body?: unknown) => {
        const { status } = await call(actor, method, path, { ...org, body });
        const ok = expected === 'ok' ? status >= 200 && status < 300 : status === expected;
        assert.ok(ok, `${method} ${path} -> ${status}, se esperaba ${expected}`);
      };

      // Lider: gestiona, pero no borra eventos ni setlists ni ve invitaciones.
      await expectStatus(leader, 'DELETE', `/api/events/${orgA.eventId}`, 403);
      await expectStatus(leader, 'DELETE', `/api/setlists/${orgA.setlistId}`, 403);
      await expectStatus(leader, 'GET', '/api/invitations', 403);
      await expectStatus(leader, 'PATCH', `/api/events/${orgA.eventId}`, 'ok', { name: 'Ensayo general' });
      await expectStatus(leader, 'GET', `/api/setlists/${orgA.setlistId}/team`, 'ok');

      // Musico: solo lectura, pero responde lo suyo.
      await expectStatus(musician, 'POST', '/api/events', 403, { name: 'x', startsAt: new Date().toISOString() });
      await expectStatus(musician, 'PATCH', `/api/songs/${orgA.songId}`, 403, { title: 'x' });
      await expectStatus(musician, 'DELETE', `/api/setlists/${orgA.setlistId}/items/${orgA.itemId}`, 403);
      await expectStatus(musician, 'GET', `/api/setlists/${orgA.setlistId}`, 'ok');
      await expectStatus(musician, 'PATCH', `/api/events/${orgA.eventId}/musicians/${orgA.eventMusicianId}`, 'ok', { status: 'CONFIRMED' });
      await expectStatus(musician, 'PATCH', `/api/setlists/${orgA.setlistId}/items/${orgA.itemId}/assignments/${orgA.assignmentId}/preparation`, 'ok', { preparationStatus: 'READY' });
      await expectStatus(musician, 'PATCH', `/api/setlists/${orgA.setlistId}/cues/${orgA.cueId}/status`, 'ok', { status: 'COMPLETED' });

      // Invitado: lee, pero no crea notas.
      await expectStatus(guest, 'GET', '/api/songs', 'ok');
      await expectStatus(guest, 'POST', `/api/songs/${orgA.songId}/notes`, 403, { content: 'x', visibility: 'ORGANIZATION' });
      await expectStatus(guest, 'PATCH', `/api/events/${orgA.eventId}/musicians/${orgA.eventMusicianId}`, 403, { status: 'DECLINED' });

      // Admin: no toca al propietario ni nombra propietarios.
      await expectStatus(admin, 'PATCH', `/api/memberships/${orgA.users.OWNER.membershipId}`, 403, { role: 'MUSICIAN' });
      await expectStatus(admin, 'PATCH', `/api/memberships/${orgA.users.MUSICIAN.membershipId}`, 403, { role: 'OWNER' });
    });

    test('al final, los datos de B siguen exactamente igual', async () => {
      assert.deepEqual(await snapshotOrganization(prisma, orgB.organizationId), snapshotB);
    });
  });
}
