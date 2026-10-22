/**
 * Pruebas e2e de invitaciones: quien puede invitar, la regla de propietario, duplicados, cancelar y aceptar.
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

type Result = { status: number; body: Record<string, unknown> & { message?: string } };

if (!testDatabaseUrl) {
  test('invitaciones (e2e)', { skip: MISSING_TEST_DATABASE_MESSAGE }, () => {});
} else {
  describe('invitaciones a la organizacion: API real contra la base de pruebas', () => {
    let api: TestApp;
    let org: SeededOrg;

    before(async () => {
      api = await startTestApp(testDatabaseUrl);
      org = await seedOrganization(api.prisma, 'A');
    });

    after(async () => {
      await api?.app.close();
    });

    async function call(role: keyof SeededOrg['users'], method: string, path: string, body?: unknown): Promise<Result> {
      const user = org.users[role];
      const response = await fetch(`${api.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${api.sign({ userId: user.userId, email: user.email })}`, 'x-organization-id': org.organizationId, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await response.text();
      return { status: response.status, body: text ? JSON.parse(text) : {} };
    }

    const invite = (role: keyof SeededOrg['users'], email: string, invitedRole = 'MUSICIAN') =>
      call(role, 'POST', '/api/invitations', { organizationId: org.organizationId, email, role: invitedRole });

    test('un propietario invita: la respuesta trae quien invito y vencimiento, pero nunca el token', async () => {
      const result = await invite('OWNER', '  Nueva@Correo.com ');
      assert.equal(result.status, 201);
      assert.equal(result.body.email, 'nueva@correo.com');
      assert.equal(result.body.status, 'PENDING');
      assert.equal((result.body.invitedBy as { id: string }).id, org.users.OWNER.userId);
      assert.ok(new Date(String(result.body.expiresAt)).getTime() > Date.now() + 6 * 86_400_000);
      assert.equal('token' in result.body, false);

      const list = await call('OWNER', 'GET', '/api/invitations');
      assert.equal(list.status, 200);
      assert.ok(!JSON.stringify(list.body).includes('"token"'));
    });

    test('duplicados y miembros actuales dan un error claro (409), no un 500', async () => {
      const again = await invite('OWNER', 'nueva@correo.com');
      assert.equal(again.status, 409);
      assert.match(String(again.body.message), /Ya hay una invitacion pendiente/);

      const existing = await invite('OWNER', org.users.MUSICIAN.email);
      assert.equal(existing.status, 409);
      assert.match(String(existing.body.message), /ya es miembro/);

      const simultaneous = await Promise.all([invite('OWNER', 'doble@correo.com'), invite('ADMIN', 'doble@correo.com')]);
      assert.deepEqual(simultaneous.map((result) => result.status).sort(), [201, 409]);
    });

    test('solo un propietario invita como propietario; un lider o musico no puede invitar', async () => {
      assert.equal((await invite('ADMIN', 'jefe@correo.com', 'OWNER')).status, 403);
      assert.equal((await invite('ADMIN', 'admin-invita@correo.com', 'LEADER')).status, 201);
      assert.equal((await invite('OWNER', 'socio@correo.com', 'OWNER')).status, 201);
      assert.equal((await invite('LEADER', 'x@correo.com')).status, 403);
      assert.equal((await invite('MUSICIAN', 'y@correo.com')).status, 403);
      assert.equal((await call('LEADER', 'GET', '/api/invitations')).status, 403);
    });

    test('cancelar varias veces invitaciones al mismo correo funciona (antes daba 500)', async () => {
      const email = 'cancelar@correo.com';
      for (let round = 0; round < 2; round += 1) {
        const created = await invite('OWNER', email);
        assert.equal(created.status, 201);
        const cancelled = await call('OWNER', 'PATCH', `/api/invitations/${String(created.body.id)}/cancel`);
        assert.equal(cancelled.status, 200);
        assert.equal(cancelled.body.status, 'CANCELLED');
        assert.equal((await call('OWNER', 'PATCH', `/api/invitations/${String(created.body.id)}/cancel`)).status, 400);
      }
    });

    test('una invitacion pendiente vencida no impide invitar de nuevo', async () => {
      const email = 'vencida@correo.com';
      const first = await invite('OWNER', email);
      await api.prisma.invitation.update({ where: { id: String(first.body.id) }, data: { expiresAt: new Date(Date.now() - 1000) } });
      const second = await invite('OWNER', email);
      assert.equal(second.status, 201);
      const statuses = (await api.prisma.invitation.findMany({ where: { email } })).map((row) => row.status).sort();
      assert.deepEqual(statuses, ['EXPIRED', 'PENDING']);
    });

    test('la persona invitada acepta con su correo y entra con el rol de la invitacion', async () => {
      const email = 'acepta@correo.com';
      await invite('OWNER', email, 'LEADER');
      const user = await api.prisma.user.create({ data: { name: 'Acepta', email, passwordHash: 'e2e-sin-login' } });
      const { token } = await api.prisma.invitation.findFirstOrThrow({ where: { email, status: 'PENDING' } });
      const response = await fetch(`${api.baseUrl}/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${api.sign({ userId: user.id, email })}` },
      });
      assert.equal(response.status, 201);
      const membership = await api.prisma.membership.findUniqueOrThrow({ where: { userId_organizationId: { userId: user.id, organizationId: org.organizationId } } });
      assert.equal(membership.role, 'LEADER');
      assert.equal((await invite('OWNER', email)).status, 409);
    });

    // --- "Mis invitaciones": la persona invitada, por el correo de su cuenta ---

    async function asUser(user: { id: string; email: string }, method: string, path: string, organizationId?: string): Promise<Result> {
      const headers: Record<string, string> = { Authorization: `Bearer ${api.sign({ userId: user.id, email: user.email })}` };
      if (organizationId) headers['x-organization-id'] = organizationId;
      const response = await fetch(`${api.baseUrl}${path}`, { method, headers });
      const text = await response.text();
      return { status: response.status, body: text ? JSON.parse(text) : {} };
    }

    const newUser = (email: string) => api.prisma.user.create({ data: { name: email, email, passwordHash: 'e2e-sin-login' }, select: { id: true, email: true } });

    test('mis invitaciones: ve solo las suyas, pendientes y sin vencer, con organizacion, rol y quien invito', async () => {
      const ana = await newUser('Ana.Mis@Correo.com');
      const mine = await invite('OWNER', 'ana.mis@correo.com', 'LEADER');
      const expired = await invite('ADMIN', 'ana.otra@correo.com');
      await api.prisma.invitation.update({ where: { id: String(expired.body.id) }, data: { email: 'ana.mis@correo.com', status: 'EXPIRED' } });
      await invite('OWNER', 'alguien-mas@correo.com');

      const result = await asUser(ana, 'GET', '/api/me/invitations');
      assert.equal(result.status, 200);
      const items = result.body as unknown as Array<Record<string, unknown>>;
      assert.equal(items.length, 1);
      assert.equal(items[0].id, mine.body.id);
      assert.equal(items[0].role, 'LEADER');
      assert.deepEqual(items[0].organization, { id: org.organizationId, name: `Org A ${org.secret}`, slug: 'org-a' });
      assert.equal((items[0].invitedBy as { id: string }).id, org.users.OWNER.userId);
      assert.ok(!JSON.stringify(items).includes('token'));
    });

    test('la invitacion de otra persona da 404 (no se revela que existe), aceptar o rechazar', async () => {
      const intruder = await newUser('intruso@correo.com');
      const theirs = await invite('OWNER', 'victima@correo.com');
      assert.equal((await asUser(intruder, 'POST', `/api/me/invitations/${String(theirs.body.id)}/accept`)).status, 404);
      assert.equal((await asUser(intruder, 'POST', `/api/me/invitations/${String(theirs.body.id)}/decline`)).status, 404);
      assert.equal((await asUser(intruder, 'POST', '/api/me/invitations/no-existe/accept')).status, 404);
      assert.equal((await api.prisma.invitation.findUniqueOrThrow({ where: { id: String(theirs.body.id) } })).status, 'PENDING');
    });

    test('una invitacion vencida no se puede aceptar', async () => {
      const user = await newUser('tarde@correo.com');
      const invitation = await invite('OWNER', 'tarde@correo.com');
      await api.prisma.invitation.update({ where: { id: String(invitation.body.id) }, data: { expiresAt: new Date(Date.now() - 1000) } });
      const result = await asUser(user, 'POST', `/api/me/invitations/${String(invitation.body.id)}/accept`);
      assert.equal(result.status, 400);
      assert.match(String(result.body.message), /expiro/);
    });

    test('aceptar crea la membresia con el rol invitado, es seguro repetirlo y da acceso solo a esa organizacion', async () => {
      const otherOrg = await seedOrganization(api.prisma, 'B');
      const user = await newUser('nuevo@correo.com');
      const invitation = await invite('OWNER', 'nuevo@correo.com', 'LEADER');
      const path = `/api/me/invitations/${String(invitation.body.id)}/accept`;

      const first = await asUser(user, 'POST', path);
      assert.equal(first.status, 200);
      assert.deepEqual(first.body.organization, { id: org.organizationId, name: `Org A ${org.secret}`, slug: 'org-a', role: 'LEADER' });
      const second = await asUser(user, 'POST', path);
      assert.equal(second.status, 200);
      assert.equal(await api.prisma.membership.count({ where: { userId: user.id } }), 1);

      assert.equal((await asUser(user, 'GET', '/api/events', org.organizationId)).status, 200);
      assert.equal((await asUser(user, 'GET', '/api/events', otherOrg.organizationId)).status, 403);
      assert.equal(((await asUser(user, 'GET', '/api/me/invitations')).body as unknown as unknown[]).length, 0);
    });

    test('rechazar la deja como DECLINED (sin borrarla), es seguro repetirlo y despues no se puede aceptar', async () => {
      const user = await newUser('no-gracias@correo.com');
      const invitation = await invite('OWNER', 'no-gracias@correo.com');
      const id = String(invitation.body.id);
      assert.equal((await asUser(user, 'POST', `/api/me/invitations/${id}/decline`)).status, 200);
      assert.equal((await asUser(user, 'POST', `/api/me/invitations/${id}/decline`)).status, 200);
      assert.equal((await api.prisma.invitation.findUniqueOrThrow({ where: { id } })).status, 'DECLINED');
      assert.equal((await asUser(user, 'POST', `/api/me/invitations/${id}/accept`)).status, 400);
      assert.equal(await api.prisma.membership.count({ where: { userId: user.id } }), 0);
      // Se puede volver a invitar a quien rechazo.
      assert.equal((await invite('OWNER', 'no-gracias@correo.com')).status, 201);
    });

    test('si ya es miembro activo, aceptar otra invitacion no le cambia el rol', async () => {
      const owner = org.users.OWNER;
      const invitation = await api.prisma.invitation.create({
        data: { organizationId: org.organizationId, email: owner.email, role: 'GUEST', token: 'token-owner', expiresAt: new Date(Date.now() + 86_400_000) },
      });
      const result = await asUser({ id: owner.userId, email: owner.email }, 'POST', `/api/me/invitations/${invitation.id}/accept`);
      assert.equal(result.status, 200);
      assert.equal((result.body.organization as { role: string }).role, 'OWNER');
    });
  });
}
