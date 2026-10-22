/**
 * Pruebas e2e de roles y permisos por organizacion: el propietario cambia permisos de los roles y eso cambia el
 * acceso real; lo critico no se puede dar; otra organizacion no se entera; restablecer vuelve a lo de siempre.
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

if (!testDatabaseUrl) {
  test('roles y permisos (e2e)', { skip: MISSING_TEST_DATABASE_MESSAGE }, () => {});
} else {
  describe('roles y permisos configurables: API real contra la base de pruebas', () => {
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

    const newSetlist = (o: SeededOrg, role: Role) => call(o, role, 'POST', '/api/setlists', { name: `Setlist de ${role}` });
    const newEvent = (o: SeededOrg, role: Role) => call(o, role, 'POST', '/api/events', { name: 'Ensayo', startsAt: new Date(Date.now() + 86_400_000).toISOString() });

    test('solo el propietario ve y cambia la matriz', async () => {
      const matrix = await call(org, 'OWNER', 'GET', '/api/role-permissions');
      assert.equal(matrix.status, 200);
      assert.equal(matrix.body.customized, false);
      assert.ok(matrix.body.defaults.LEADER.includes('events.manage'));
      assert.ok(!matrix.body.configurable.includes('roles.manage'));
      for (const role of ['ADMIN', 'LEADER', 'MUSICIAN', 'GUEST'] as const) {
        assert.equal((await call(org, role, 'GET', '/api/role-permissions')).status, 403, role);
        assert.equal((await call(org, role, 'DELETE', '/api/role-permissions')).status, 403, role);
      }
    });

    test('un cambio del propietario cambia el acceso real, solo en su organizacion', async () => {
      assert.equal((await newSetlist(org, 'MUSICIAN')).status, 403);
      assert.equal((await newEvent(org, 'LEADER')).status, 201);

      const current = (await call(org, 'OWNER', 'GET', '/api/role-permissions')).body;
      const saved = await call(org, 'OWNER', 'PUT', '/api/role-permissions', {
        roles: {
          MUSICIAN: [...current.effective.MUSICIAN, 'setlists.manage'],
          LEADER: current.effective.LEADER.filter((permission: string) => permission !== 'events.manage'),
        },
      });
      assert.equal(saved.status, 200);
      assert.equal(saved.body.customized, true);
      assert.ok(saved.body.effective.MUSICIAN.includes('setlists.manage'));

      assert.equal((await newSetlist(org, 'MUSICIAN')).status, 201, 'el musico ahora arma setlists');
      assert.equal((await newEvent(org, 'LEADER')).status, 403, 'el lider ya no gestiona eventos');
      assert.equal((await call(org, 'LEADER', 'POST', '/api/songs', { title: 'Nueva', artist: 'X', originalKey: 'C', currentKey: 'C' })).status, 201, 'lo demas sigue igual');

      // La otra organizacion no cambia.
      assert.equal((await newSetlist(other, 'MUSICIAN')).status, 403);
      assert.equal((await newEvent(other, 'LEADER')).status, 201);
      assert.equal((await call(other, 'OWNER', 'GET', '/api/role-permissions')).body.customized, false);
    });

    test('lo critico no se puede dar a nadie mas que al propietario', async () => {
      const saved = await call(org, 'OWNER', 'PUT', '/api/role-permissions', { roles: { ADMIN: ['organization.transfer', 'organization.archive', 'roles.manage', 'members.manage'] } });
      assert.equal(saved.status, 200);
      assert.ok(!saved.body.effective.ADMIN.includes('roles.manage'));
      assert.equal((await call(org, 'ADMIN', 'GET', '/api/role-permissions')).status, 403);
      assert.equal((await call(org, 'ADMIN', 'POST', `/api/organizations/${org.organizationId}/archive`, { confirmName: 'x' })).status, 403);
      assert.equal((await call(org, 'ADMIN', 'GET', '/api/setlists')).status, 200, 'leer siempre se puede');
      assert.equal((await call(org, 'OWNER', 'PUT', '/api/role-permissions', { roles: { OWNER: [] } })).status, 400, 'el propietario no se configura');
    });

    test('restablecer vuelve a los valores por defecto', async () => {
      const reset = await call(org, 'OWNER', 'DELETE', '/api/role-permissions');
      assert.equal(reset.status, 200);
      assert.equal(reset.body.customized, false);
      assert.equal((await newSetlist(org, 'MUSICIAN')).status, 403);
      assert.equal((await newEvent(org, 'LEADER')).status, 201);
      assert.equal(await api.prisma.rolePermissionOverride.count({ where: { organizationId: org.organizationId } }), 0);
    });
  });
}
