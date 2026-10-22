/**
 * Pruebas e2e del modo escenario en vivo: el lider inicia y avanza, los demas lo reciben por el stream SSE,
 * un solo lider a la vez (409 y "tomar el liderazgo"), pasar el liderazgo, terminar, permisos y organizaciones.
 */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { config } from 'dotenv';
import type { LiveStageState } from '@harmonyhub/contracts';
import { seedOrganization, type SeededOrg } from './seed';
import { getTestDatabaseUrl, MISSING_TEST_DATABASE_MESSAGE } from './test-database';
import { startTestApp, type TestApp } from './test-app';

config({ path: resolve(__dirname, '../../../../.env'), quiet: true });
const testDatabaseUrl = getTestDatabaseUrl();

type Role = keyof SeededOrg['users'];

if (!testDatabaseUrl) {
  test('modo escenario en vivo (e2e)', { skip: MISSING_TEST_DATABASE_MESSAGE }, () => {});
} else {
  describe('modo escenario en vivo: API real contra la base de pruebas', () => {
    let api: TestApp;
    let org: SeededOrg;
    let other: SeededOrg;
    const streams: Array<() => void> = [];

    before(async () => {
      process.env.NOTIFICATION_REMINDERS_INTERVAL_MS = 'off';
      process.env.LIVE_STAGE_HEARTBEAT_MS = '150';
      api = await startTestApp(testDatabaseUrl);
      org = await seedOrganization(api.prisma, 'A');
      other = await seedOrganization(api.prisma, 'B');
    });

    after(async () => {
      streams.forEach((close) => close());
      await api?.app.close();
    });

    const headers = (o: SeededOrg, role: Role, organizationId = o.organizationId) => ({
      Authorization: `Bearer ${api.sign({ userId: o.users[role].userId, email: o.users[role].email })}`,
      'x-organization-id': organizationId,
      'Content-Type': 'application/json',
    });

    async function post(o: SeededOrg, role: Role, action: string, body: unknown = {}, setlistId = o.setlistId) {
      const response = await fetch(`${api.baseUrl}/api/setlists/${setlistId}/live/${action}`, { method: 'POST', headers: headers(o, role), body: JSON.stringify(body) });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- respuestas JSON variadas (estado, 409, errores)
      return { status: response.status, body: (await response.json()) as any };
    }

    /** Abre el stream como lo hace la app (fetch con el bearer) y junta los estados que llegan. */
    async function connect(o: SeededOrg, role: Role, setlistId = o.setlistId, organizationId = o.organizationId) {
      const controller = new AbortController();
      const response = await fetch(`${api.baseUrl}/api/setlists/${setlistId}/live/stream`, { headers: headers(o, role, organizationId), signal: controller.signal });
      const states: LiveStageState[] = [];
      let raw = '';
      const waiters: Array<() => void> = [];
      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        void (async () => {
          let buffer = '';
          for (;;) {
            const { value, done } = await reader.read().catch(() => ({ value: undefined, done: true }));
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            raw += text;
            buffer += text;
            let index;
            while ((index = buffer.indexOf('\n\n')) >= 0) {
              const block = buffer.slice(0, index);
              buffer = buffer.slice(index + 2);
              const data = block.split('\n').find((line) => line.startsWith('data: '));
              if (data) states.push(JSON.parse(data.slice(6)));
            }
            waiters.splice(0).forEach((wake) => wake());
          }
        })();
      }
      const close = () => controller.abort();
      streams.push(close);
      /** Espera hasta que llegue un estado que cumpla la condicion (o falla a los 3 s). */
      const waitFor = async (predicate: (state: LiveStageState) => boolean, label: string) => {
        const deadline = Date.now() + 3000;
        for (;;) {
          const found = states.find(predicate);
          if (found) return found;
          if (Date.now() > deadline) throw new Error(`no llego: ${label}. Llegaron: ${JSON.stringify(states)}`);
          await new Promise<void>((wake) => {
            waiters.push(wake);
            setTimeout(wake, 100);
          });
        }
      };
      return { status: response.status, contentType: response.headers.get('content-type'), states, raw: () => raw, waitFor, close };
    }

    test('el lider inicia y avanza; musicos e invitados lo reciben al momento', async () => {
      const musician = await connect(org, 'MUSICIAN');
      const guest = await connect(org, 'GUEST');
      assert.equal(musician.status, 200);
      assert.match(musician.contentType ?? '', /text\/event-stream/);
      await musician.waitFor((state) => !state.live, 'estado inicial sin sesion');

      const started = await post(org, 'LEADER', 'start');
      assert.equal(started.status, 200);
      assert.equal(started.body.leader.membershipId, org.users.LEADER.membershipId);
      await guest.waitFor((state) => state.live && state.leader.userId === org.users.LEADER.userId, 'inicio');

      assert.equal((await post(org, 'LEADER', 'advance', { currentItemId: org.itemId })).status, 200);
      const followed = await musician.waitFor((state) => state.live && state.currentItemId === org.itemId, 'avance');
      assert.ok(followed.live && followed.version >= 2);
    });

    test('un solo lider: 409 con quien dirige, "tomar el liderazgo" explicito; sin permiso, 403', async () => {
      const conflict = await post(org, 'ADMIN', 'start');
      assert.equal(conflict.status, 409);
      assert.equal(conflict.body.leader.membershipId, org.users.LEADER.membershipId);
      assert.match(conflict.body.message, /ya esta dirigiendo/);

      assert.equal((await post(org, 'MUSICIAN', 'start')).status, 403);
      assert.equal((await post(org, 'MUSICIAN', 'advance', { currentItemId: org.itemId })).status, 403);

      const taken = await post(org, 'ADMIN', 'start', { takeOver: true });
      assert.equal(taken.status, 200);
      assert.equal(taken.body.leader.membershipId, org.users.ADMIN.membershipId);
      assert.equal(taken.body.currentItemId, org.itemId, 'tomar el liderazgo conserva el item actual');
      assert.equal((await post(org, 'LEADER', 'advance', { currentItemId: org.itemId })).status, 403, 'quien dejo de dirigir ya no avanza');
    });

    test('pasar el liderazgo solo a quien puede dirigir; terminar avisa a todos', async () => {
      const follower = await connect(org, 'MUSICIAN');
      assert.equal((await post(org, 'ADMIN', 'handover', { membershipId: org.users.MUSICIAN.membershipId })).status, 400);
      assert.equal((await post(org, 'ADMIN', 'handover', { membershipId: other.users.OWNER.membershipId })).status, 404);
      const handed = await post(org, 'ADMIN', 'handover', { membershipId: org.users.OWNER.membershipId });
      assert.equal(handed.status, 200);
      await follower.waitFor((state) => state.live && state.leader.userId === org.users.OWNER.userId, 'nuevo lider');

      assert.equal((await post(org, 'ADMIN', 'end')).status, 403);
      assert.deepEqual((await post(org, 'OWNER', 'end')).body, { live: false, setlistId: org.setlistId });
      await follower.waitFor((state) => !state.live && follower.states.some((s) => s.live), 'fin de la sesion');
      assert.equal((await post(org, 'OWNER', 'advance', { currentItemId: org.itemId })).status, 409, 'sin sesion no hay que avanzar');
    });

    test('al reconectar llega el estado actual; el heartbeat mantiene viva la conexion', async () => {
      await post(org, 'LEADER', 'start', { currentItemId: org.itemId });
      const late = await connect(org, 'GUEST');
      const first = await late.waitFor(() => true, 'primer estado');
      assert.ok(first.live && first.currentItemId === org.itemId);
      await new Promise((wake) => setTimeout(wake, 400));
      assert.match(late.raw(), /: ping/);
      await post(org, 'LEADER', 'end');
    });

    test('cada organizacion ve lo suyo y el item tiene que ser del setlist', async () => {
      const foreign = await connect(other, 'OWNER', org.setlistId, other.organizationId);
      assert.equal(foreign.status, 404);
      const outsider = await connect(other, 'OWNER', org.setlistId, org.organizationId);
      assert.equal(outsider.status, 403);
      assert.equal((await post(other, 'OWNER', 'start', {}, org.setlistId)).status, 404);

      await post(org, 'LEADER', 'start');
      assert.equal((await post(org, 'LEADER', 'advance', { currentItemId: other.itemId })).status, 404);
      await post(org, 'LEADER', 'end');
    });

    test('una organizacion archivada es de solo lectura: no se puede iniciar en vivo', async () => {
      await api.prisma.organization.update({ where: { id: other.organizationId }, data: { archivedAt: new Date() } });
      const archived = await post(other, 'OWNER', 'start');
      assert.equal(archived.status, 403);
      assert.match(archived.body.message, /archivada/);
      const reading = await connect(other, 'MUSICIAN');
      assert.equal(reading.status, 200, 'consultar sigue permitido');
    });
  });
}
