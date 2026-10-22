/**
 * Pruebas e2e de enlaces de solo lectura de un setlist: quien edita el setlist los crea, ve y revoca; la pagina
 * publica se abre sin sesion y muestra solo lo necesario para tocar; vencidos, revocados, de organizaciones
 * archivadas o inventados dan el mismo 404.
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
const PRIVATE = 'PRIVADO-NO-PUBLICAR';
const DAY = 86_400_000;

if (!testDatabaseUrl) {
  test('enlaces compartidos (e2e)', { skip: MISSING_TEST_DATABASE_MESSAGE }, () => {});
} else {
  describe('enlaces de solo lectura de setlists: API real contra la base de pruebas', () => {
    let api: TestApp;
    let org: SeededOrg;
    let other: SeededOrg;

    before(async () => {
      process.env.NOTIFICATION_REMINDERS_INTERVAL_MS = 'off';
      api = await startTestApp(testDatabaseUrl);
      org = await seedOrganization(api.prisma, 'A');
      other = await seedOrganization(api.prisma, 'B');

      // Datos privados por todos lados: nada de esto puede salir en la pagina publica.
      const item = await api.prisma.setlistItem.findUniqueOrThrow({ where: { id: org.itemId }, select: { songVersionId: true } });
      await api.prisma.setlistItem.update({ where: { id: org.itemId }, data: { internalNote: PRIVATE, transitionNote: PRIVATE, description: PRIVATE, keyOverride: 'D' } });
      await api.prisma.songVersion.update({
        where: { id: item.songVersionId! },
        data: {
          notes: PRIVATE,
          contentJson: { version: 1, sections: [{ id: 'v1', type: 'VERSE', name: 'Verso 1', order: 0, notes: PRIVATE, lines: [{ id: 'l1', order: 0, chords: 'C   G', lyrics: 'Letra publica' }] }] },
        },
      });
      await api.prisma.setlistItem.create({ data: { setlistId: org.setlistId, title: `Oculto ${PRIVATE}`, order: 2, type: 'SPEAKING', isHidden: true } });
      await api.prisma.setlistItem.create({ data: { setlistId: org.setlistId, title: 'Oración', order: 3, type: 'PRAYER', description: PRIVATE } });
      await api.prisma.event.update({ where: { id: org.eventId }, data: { setlistId: org.setlistId, description: PRIVATE, location: PRIVATE } });
    });

    after(async () => {
      await api?.app.close();
    });

    async function call(o: SeededOrg, role: Role, method: string, path: string, body?: unknown, organizationId = o.organizationId) {
      const user = o.users[role];
      const response = await fetch(`${api.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${api.sign({ userId: user.userId, email: user.email })}`, 'x-organization-id': organizationId, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await response.text();
      return { status: response.status, body: text ? JSON.parse(text) : {} };
    }

    /** Sin sesion, sin organizacion: como lo abre alguien sin cuenta. */
    async function open(token: string) {
      const response = await fetch(`${api.baseUrl}/api/public/shared-setlists/${encodeURIComponent(token)}`);
      const text = await response.text();
      return { status: response.status, headers: response.headers, text, body: text ? JSON.parse(text) : {} };
    }

    const linksPath = (o: SeededOrg) => `/api/setlists/${o.setlistId}/share-links`;
    const createLink = async (role: Role = 'LEADER', duration?: string) => (await call(org, role, 'POST', linksPath(org), duration ? { duration } : {})).body;

    test('quien edita el setlist crea un enlace (30 dias por defecto) y lo ve en la lista sin el token', async () => {
      const before = Date.now();
      const created = await call(org, 'LEADER', 'POST', linksPath(org), {});
      assert.equal(created.status, 201);
      assert.match(created.body.token, /^[A-Za-z0-9_-]{43}$/);
      assert.ok(!created.body.token.includes(org.setlistId));
      const expires = new Date(created.body.expiresAt).getTime();
      assert.ok(Math.abs(expires - (before + 30 * DAY)) < 60_000);
      assert.deepEqual(created.body.createdBy, { id: org.users.LEADER.userId, name: `LEADER A ${org.secret}` });

      const stored = await api.prisma.setlistShareLink.findUniqueOrThrow({ where: { id: created.body.id } });
      assert.notEqual(stored.tokenHash, created.body.token, 'en la base solo queda el hash');

      const list = await call(org, 'GUEST', 'GET', linksPath(org));
      assert.equal(list.status, 403, 'ver los enlaces es de quien edita');
      const own = await call(org, 'ADMIN', 'GET', linksPath(org));
      assert.equal(own.status, 200);
      const row = own.body.items.find((link: { id: string }) => link.id === created.body.id);
      assert.equal(row.token, undefined);
      assert.equal(row.lastAccessedAt, null);

      assert.equal((await call(org, 'LEADER', 'POST', linksPath(org), { duration: 'never' })).body.expiresAt, null);
      const week = (await call(org, 'LEADER', 'POST', linksPath(org), { duration: '7d' })).body.expiresAt;
      assert.ok(Math.abs(new Date(week).getTime() - (Date.now() + 7 * DAY)) < 60_000);
      assert.equal((await call(org, 'LEADER', 'POST', linksPath(org), { duration: '1y' })).status, 400);
    });

    test('musicos e invitados no crean ni revocan enlaces', async () => {
      const link = await createLink();
      for (const role of ['MUSICIAN', 'GUEST'] as const) {
        assert.equal((await call(org, role, 'POST', linksPath(org), {})).status, 403);
        assert.equal((await call(org, role, 'DELETE', `${linksPath(org)}/${link.id}`)).status, 403);
      }
    });

    test('la pagina publica se abre sin sesion, con solo lo necesario para tocar', async () => {
      const link = await createLink();
      const shared = await open(link.token);
      assert.equal(shared.status, 200);
      assert.equal(shared.headers.get('cache-control'), 'no-store, private');
      assert.match(shared.headers.get('x-robots-tag') ?? '', /noindex/);
      assert.equal(shared.headers.get('referrer-policy'), 'no-referrer');

      assert.deepEqual(Object.keys(shared.body).sort(), ['eventStartsAt', 'items', 'name']);
      assert.equal(shared.body.name, `Setlist ${org.secret}`);
      assert.ok(shared.body.eventStartsAt, 'trae la fecha del evento que usa el setlist');
      assert.deepEqual(shared.body.items.map((item: { title: string }) => item.title), [`Item ${org.secret}`, 'Oración'], 'sin items ocultos');
      const [song, prayer] = shared.body.items;
      assert.deepEqual(Object.keys(song).sort(), ['artist', 'content', 'key', 'order', 'originalKey', 'title', 'type']);
      assert.equal(song.key, 'D');
      assert.equal(song.originalKey, 'C');
      assert.deepEqual(song.content.sections[0].lines.map((line: { chords: string; lyrics: string }) => [line.chords, line.lyrics]), [['C   G', 'Letra publica']]);
      assert.equal(prayer.content, null);

      for (const leak of [PRIVATE, 'MUSICIAN', 'OWNER', '@e2e.test', '555-', `Org A`, `Cue ${org.secret}`, `Pista ${org.secret}`, `Archivo ${org.secret}`, `Revision ${org.secret}`, `Version ${org.secret}`, org.setlistId, org.organizationId, org.eventId]) {
        assert.ok(!shared.text.includes(leak), `la pagina publica no deberia incluir "${leak}"`);
      }

      const row = (await call(org, 'LEADER', 'GET', linksPath(org))).body.items.find((item: { id: string }) => item.id === link.id);
      assert.ok(row.lastAccessedAt, 'se registra el ultimo acceso');
      assert.equal(row.accessCount, 1);
    });

    test('el token no sirve como sesion para otras rutas', async () => {
      const link = await createLink();
      const response = await fetch(`${api.baseUrl}/api/setlists/${org.setlistId}`, { headers: { Authorization: `Bearer ${link.token}`, 'x-organization-id': org.organizationId } });
      assert.equal(response.status, 401);
    });

    test('revocado, vencido o inventado: el mismo 404 generico', async () => {
      const revoked = await createLink();
      assert.equal((await open(revoked.token)).status, 200);
      assert.equal((await call(org, 'LEADER', 'DELETE', `${linksPath(org)}/${revoked.id}`)).status, 200);
      assert.equal((await call(org, 'LEADER', 'DELETE', `${linksPath(org)}/${revoked.id}`)).status, 404, 'no se revoca dos veces');
      const list = (await call(org, 'LEADER', 'GET', linksPath(org))).body.items;
      assert.ok(!list.some((link: { id: string }) => link.id === revoked.id), 'los revocados no salen en la lista');

      const expired = await createLink();
      await api.prisma.setlistShareLink.update({ where: { id: expired.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
      assert.ok(!(await call(org, 'LEADER', 'GET', linksPath(org))).body.items.some((link: { id: string }) => link.id === expired.id));

      const answers = await Promise.all([open(revoked.token), open(expired.token), open('A'.repeat(43)), open('no-es-un-token')]);
      for (const answer of answers) {
        assert.equal(answer.status, 404);
        assert.equal(answer.headers.get('cache-control'), 'no-store, private');
        assert.match(answer.headers.get('x-robots-tag') ?? '', /noindex/);
      }
      assert.equal(new Set(answers.map((answer) => answer.text)).size, 1, 'no se distingue por que no sirve');
    });

    test('otra organizacion no ve, crea ni revoca los enlaces de este setlist', async () => {
      const link = await createLink();
      assert.equal((await call(other, 'OWNER', 'GET', linksPath(org))).status, 404);
      assert.equal((await call(other, 'OWNER', 'POST', linksPath(org), {})).status, 404);
      assert.equal((await call(other, 'OWNER', 'DELETE', `${linksPath(org)}/${link.id}`)).status, 404);
      assert.equal((await call(other, 'OWNER', 'DELETE', `${linksPath(other)}/${link.id}`)).status, 404, 'el enlace no es de ese setlist');
      assert.equal((await call(org, 'OWNER', 'GET', linksPath(org), undefined, other.organizationId)).status, 403);
      assert.equal((await open(link.token)).status, 200, 'sigue funcionando');
    });

    test('las plantillas no se comparten', async () => {
      const template = (await call(org, 'OWNER', 'POST', `/api/setlists/${org.setlistId}/save-as-template`, { name: 'Plantilla' })).body;
      assert.equal((await call(org, 'OWNER', 'POST', `/api/setlists/${template.id}/share-links`, {})).status, 400);
    });

    test('con la organizacion archivada los enlaces dejan de funcionar y vuelven al restaurarla', async () => {
      const link = await createLink();
      await api.prisma.organization.update({ where: { id: org.organizationId }, data: { archivedAt: new Date() } });
      try {
        assert.equal((await open(link.token)).status, 404);
        assert.equal((await call(org, 'OWNER', 'POST', linksPath(org), {})).status, 403, 'archivada: no se crean enlaces');
      } finally {
        await api.prisma.organization.update({ where: { id: org.organizationId }, data: { archivedAt: null } });
      }
      assert.equal((await open(link.token)).status, 200);
    });

    test('al borrar el setlist se borran sus enlaces', async () => {
      const setlist = await api.prisma.setlist.create({ data: { organizationId: org.organizationId, name: 'Temporal' } });
      const link = (await call(org, 'LEADER', 'POST', `/api/setlists/${setlist.id}/share-links`, {})).body;
      assert.equal((await open(link.token)).status, 200);
      assert.equal((await call(org, 'ADMIN', 'DELETE', `/api/setlists/${setlist.id}`)).status, 200);
      assert.equal((await open(link.token)).status, 404);
      assert.equal(await api.prisma.setlistShareLink.count({ where: { setlistId: setlist.id } }), 0);
    });
  });
}
