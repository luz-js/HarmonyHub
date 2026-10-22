/**
 * Pruebas e2e de salir, transferir y archivar una organizacion: nunca queda sin propietario y una archivada es
 * de solo lectura para todos (incluidas las rutas que escriben lo propio), hasta que un propietario la restaura.
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
type Result = { status: number; body: Record<string, unknown> & { message?: string } };

if (!testDatabaseUrl) {
  test('salir, transferir y archivar (e2e)', { skip: MISSING_TEST_DATABASE_MESSAGE }, () => {});
} else {
  describe('salir, transferir y archivar una organizacion: API real contra la base de pruebas', () => {
    let api: TestApp;
    let leaveOrg: SeededOrg;
    let transferOrg: SeededOrg;
    let archiveOrg: SeededOrg;

    before(async () => {
      api = await startTestApp(testDatabaseUrl);
      leaveOrg = await seedOrganization(api.prisma, 'L');
      transferOrg = await seedOrganization(api.prisma, 'T');
      archiveOrg = await seedOrganization(api.prisma, 'R');
    });

    after(async () => {
      await api?.app.close();
    });

    async function call(org: SeededOrg, role: Role, method: string, path: string, body?: unknown): Promise<Result> {
      const user = org.users[role];
      const response = await fetch(`${api.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${api.sign({ userId: user.userId, email: user.email })}`, 'x-organization-id': org.organizationId, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await response.text();
      return { status: response.status, body: text ? JSON.parse(text) : {} };
    }

    const membership = (org: SeededOrg, role: Role) => api.prisma.membership.findUniqueOrThrow({ where: { id: org.users[role].membershipId } });

    test('salir: la membresia queda inactiva (no se borra) y ya no entra a la organizacion', async () => {
      const result = await call(leaveOrg, 'GUEST', 'POST', `/api/organizations/${leaveOrg.organizationId}/leave`);
      assert.equal(result.status, 200);
      assert.equal((await membership(leaveOrg, 'GUEST')).status, 'INACTIVE');
      assert.equal((await call(leaveOrg, 'GUEST', 'GET', '/api/events')).status, 403);
    });

    test('el ultimo propietario no puede salir; con otro propietario si puede', async () => {
      const lastOwner = await call(leaveOrg, 'OWNER', 'POST', `/api/organizations/${leaveOrg.organizationId}/leave`);
      assert.equal(lastOwner.status, 409);
      assert.match(String(lastOwner.body.message), /unica persona propietaria/);

      await call(leaveOrg, 'OWNER', 'PATCH', `/api/memberships/${leaveOrg.users.ADMIN.membershipId}`, { role: 'OWNER' });
      assert.equal((await call(leaveOrg, 'OWNER', 'POST', `/api/organizations/${leaveOrg.organizationId}/leave`)).status, 200);
      const owners = await api.prisma.membership.count({ where: { organizationId: leaveOrg.organizationId, role: 'OWNER', status: 'ACTIVE' } });
      assert.equal(owners, 1);
    });

    test('dos propietarios que salen a la vez no dejan la organizacion sin ninguno', async () => {
      const org = await seedOrganization(api.prisma, 'D');
      await api.prisma.membership.update({ where: { id: org.users.ADMIN.membershipId }, data: { role: 'OWNER' } });
      const results = await Promise.all([
        call(org, 'OWNER', 'POST', `/api/organizations/${org.organizationId}/leave`),
        call(org, 'ADMIN', 'POST', `/api/organizations/${org.organizationId}/leave`),
      ]);
      assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);
      assert.equal(await api.prisma.membership.count({ where: { organizationId: org.organizationId, role: 'OWNER', status: 'ACTIVE' } }), 1);
    });

    test('transferir: el nuevo queda propietario y quien transfiere pasa a admin (por defecto); solo un propietario puede', async () => {
      const path = `/api/organizations/${transferOrg.organizationId}/transfer`;
      assert.equal((await call(transferOrg, 'ADMIN', 'POST', path, { membershipId: transferOrg.users.LEADER.membershipId })).status, 403);
      assert.equal((await call(transferOrg, 'OWNER', 'POST', path, { membershipId: leaveOrg.users.MUSICIAN.membershipId })).status, 404);
      assert.equal((await call(transferOrg, 'OWNER', 'POST', path, { membershipId: transferOrg.users.OWNER.membershipId })).status, 400);

      const result = await call(transferOrg, 'OWNER', 'POST', path, { membershipId: transferOrg.users.LEADER.membershipId });
      assert.equal(result.status, 200);
      assert.equal((await membership(transferOrg, 'LEADER')).role, 'OWNER');
      assert.equal((await membership(transferOrg, 'OWNER')).role, 'ADMIN');
    });

    test('transferir sin dejar de ser propietario deja dos propietarios', async () => {
      const org = await seedOrganization(api.prisma, 'S');
      const result = await call(org, 'OWNER', 'POST', `/api/organizations/${org.organizationId}/transfer`, { membershipId: org.users.MUSICIAN.membershipId, stepDown: false });
      assert.equal(result.status, 200);
      assert.equal((await membership(org, 'OWNER')).role, 'OWNER');
      assert.equal((await membership(org, 'MUSICIAN')).role, 'OWNER');
    });

    test('archivar: solo un propietario y escribiendo el nombre; no se puede archivar otra organizacion', async () => {
      const path = `/api/organizations/${archiveOrg.organizationId}/archive`;
      assert.equal((await call(archiveOrg, 'ADMIN', 'POST', path, { confirmName: `Org R ${archiveOrg.secret}` })).status, 403);
      assert.equal((await call(archiveOrg, 'OWNER', 'POST', path, { confirmName: 'otro nombre' })).status, 400);
      assert.equal((await call(transferOrg, 'LEADER', 'POST', path, { confirmName: `Org R ${archiveOrg.secret}` })).status, 403);

      const result = await call(archiveOrg, 'OWNER', 'POST', path, { confirmName: `  org r ${archiveOrg.secret.toLowerCase()} ` });
      assert.equal(result.status, 200);
      assert.ok(result.body.archivedAt);
    });

    test('una organizacion archivada es de solo lectura para todos, en todos los modulos', async () => {
      const org = archiveOrg;
      const writes: [Role, string, string, unknown?][] = [
        ['OWNER', 'POST', '/api/events', { name: 'x', startsAt: new Date().toISOString() }],
        ['OWNER', 'PATCH', `/api/songs/${org.songId}`, { title: 'x' }],
        ['OWNER', 'POST', `/api/setlists/${org.setlistId}/items`, { type: 'BREAK', title: 'Pausa' }],
        ['OWNER', 'DELETE', `/api/setlists/${org.setlistId}/cues/${org.cueId}`],
        ['OWNER', 'PATCH', `/api/organizations/${org.organizationId}`, { name: 'x' }],
        ['OWNER', 'POST', '/api/invitations', { organizationId: org.organizationId, email: 'x@correo.com', role: 'MUSICIAN' }],
        ['OWNER', 'PATCH', `/api/invitations/${org.invitationId}/cancel`],
        ['OWNER', 'PATCH', `/api/memberships/${org.users.MUSICIAN.membershipId}`, { role: 'LEADER' }],
        ['OWNER', 'POST', `/api/organizations/${org.organizationId}/transfer`, { membershipId: org.users.ADMIN.membershipId }],
        // Rutas 'read' que escriben lo propio: tambien bloqueadas.
        ['MUSICIAN', 'PATCH', `/api/events/${org.eventId}/musicians/${org.eventMusicianId}`, { status: 'CONFIRMED' }],
        ['MUSICIAN', 'POST', `/api/songs/${org.songId}/notes`, { content: 'x', visibility: 'PRIVATE' }],
        ['MUSICIAN', 'PATCH', `/api/setlists/${org.setlistId}/cues/${org.cueId}/status`, { status: 'COMPLETED' }],
      ];
      const failures: string[] = [];
      for (const [role, method, path, body] of writes) {
        const result = await call(org, role, method, path, body);
        if (result.status !== 403 || !/archivada/.test(String(result.body.message))) failures.push(`${role} ${method} ${path} -> ${result.status} ${result.body.message}`);
      }
      assert.deepEqual(failures, [], failures.join('\n'));

      for (const path of ['/api/events', '/api/songs', `/api/setlists/${org.setlistId}`, '/api/memberships', `/api/organizations/${org.organizationId}`]) {
        assert.equal((await call(org, 'MUSICIAN', 'GET', path)).status, 200, path);
      }
    });

    test('nadie puede unirse a una organizacion archivada, pero si se puede salir de ella', async () => {
      const user = await api.prisma.user.create({ data: { name: 'Tarde', email: 'tarde-archivo@correo.com', passwordHash: 'e2e-sin-login' } });
      const invitation = await api.prisma.invitation.create({
        data: { organizationId: archiveOrg.organizationId, email: user.email, token: 'token-archivada', expiresAt: new Date(Date.now() + 86_400_000) },
      });
      const response = await fetch(`${api.baseUrl}/api/me/invitations/${invitation.id}/accept`, { method: 'POST', headers: { Authorization: `Bearer ${api.sign({ userId: user.id, email: user.email })}` } });
      assert.equal(response.status, 400);
      assert.equal((await call(archiveOrg, 'GUEST', 'POST', `/api/organizations/${archiveOrg.organizationId}/leave`)).status, 200);
    });

    test('restaurar: solo un propietario; despues se puede escribir de nuevo', async () => {
      const path = `/api/organizations/${archiveOrg.organizationId}/restore`;
      assert.equal((await call(archiveOrg, 'ADMIN', 'POST', path)).status, 403);
      assert.equal((await call(archiveOrg, 'OWNER', 'POST', path)).status, 200);
      assert.equal((await call(archiveOrg, 'MUSICIAN', 'PATCH', `/api/events/${archiveOrg.eventId}/musicians/${archiveOrg.eventMusicianId}`, { status: 'CONFIRMED' })).status, 200);
      assert.equal((await call(archiveOrg, 'OWNER', 'PATCH', `/api/songs/${archiveOrg.songId}`, { title: 'De nuevo' })).status, 200);
    });

    test('la sesion (auth/me) informa que la organizacion esta archivada', async () => {
      const org = await seedOrganization(api.prisma, 'M');
      await call(org, 'OWNER', 'POST', `/api/organizations/${org.organizationId}/archive`, { confirmName: `Org M ${org.secret}` });
      const me = await call(org, 'MUSICIAN', 'GET', '/api/auth/me');
      const organizations = (me.body.user as { organizations: { id: string; archivedAt: string | null }[] }).organizations;
      assert.ok(organizations.find((item) => item.id === org.organizationId)?.archivedAt);
    });
  });
}
