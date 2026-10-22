/**
 * Pruebas e2e de la organizacion activa guardada en la cuenta: sirve en cualquier dispositivo (auth/me y login),
 * solo acepta organizaciones donde la persona es miembro activo y se corrige sola al salir o al ser desactivada.
 */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { config } from 'dotenv';
import { hashPassword } from '../auth/password';
import { seedOrganization, type SeededOrg } from './seed';
import { getTestDatabaseUrl, MISSING_TEST_DATABASE_MESSAGE } from './test-database';
import { startTestApp, type TestApp } from './test-app';

config({ path: resolve(__dirname, '../../../../.env'), quiet: true });
const testDatabaseUrl = getTestDatabaseUrl();

type Person = { id: string; email: string };

if (!testDatabaseUrl) {
  test('organizacion activa en la cuenta (e2e)', { skip: MISSING_TEST_DATABASE_MESSAGE }, () => {});
} else {
  describe('organizacion activa guardada en la cuenta: API real contra la base de pruebas', () => {
    let api: TestApp;
    let orgA: SeededOrg;
    let orgB: SeededOrg;
    let outsiderOrg: SeededOrg;
    const password = 'clave-segura-123';

    before(async () => {
      api = await startTestApp(testDatabaseUrl);
      orgA = await seedOrganization(api.prisma, 'A');
      orgB = await seedOrganization(api.prisma, 'B');
      outsiderOrg = await seedOrganization(api.prisma, 'C');
    });

    after(async () => {
      await api?.app.close();
    });

    /** Persona miembro (activa) de A y luego de B, en ese orden. */
    async function personInAandB(email: string): Promise<Person> {
      const user = await api.prisma.user.create({ data: { name: email, email, passwordHash: hashPassword(password) }, select: { id: true, email: true } });
      await api.prisma.membership.create({ data: { userId: user.id, organizationId: orgA.organizationId, role: 'MUSICIAN', joinedAt: new Date(Date.now() - 60_000) } });
      await api.prisma.membership.create({ data: { userId: user.id, organizationId: orgB.organizationId, role: 'MUSICIAN' } });
      return user;
    }

    async function call(person: Person, method: string, path: string, body?: unknown, organizationId?: string) {
      const headers: Record<string, string> = { Authorization: `Bearer ${api.sign({ userId: person.id, email: person.email })}`, 'Content-Type': 'application/json' };
      if (organizationId) headers['x-organization-id'] = organizationId;
      const response = await fetch(`${api.baseUrl}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      const text = await response.text();
      return { status: response.status, body: text ? JSON.parse(text) : {} };
    }

    const setActive = (person: Person, organizationId: unknown) => call(person, 'PUT', '/api/me/active-organization', { organizationId });
    const currentOf = async (person: Person) => (await call(person, 'GET', '/api/auth/me')).body.user.currentOrganizationId as string | undefined;
    const owner = (org: SeededOrg): Person => ({ id: org.users.OWNER.userId, email: org.users.OWNER.email });

    test('sin nada guardado usa la primera organizacion activa; al guardar otra, auth/me y el login la devuelven', async () => {
      const person = await personInAandB('dos-orgs@correo.com');
      assert.equal(await currentOf(person), orgA.organizationId);

      assert.equal((await setActive(person, orgB.organizationId)).status, 200);
      // "Otro dispositivo": nada del navegador, solo lo que dice el servidor.
      assert.equal(await currentOf(person), orgB.organizationId);
      const login = await fetch(`${api.baseUrl}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: person.email, password }) });
      assert.equal(((await login.json()) as { user: { currentOrganizationId: string } }).user.currentOrganizationId, orgB.organizationId);
    });

    test('solo acepta organizaciones donde es miembro activo; las demas dan 404 sin revelar nada', async () => {
      const person = await personInAandB('no-ajena@correo.com');
      assert.equal((await setActive(person, outsiderOrg.organizationId)).status, 404);
      assert.equal((await setActive(person, 'no-existe')).status, 404);
      assert.equal((await setActive(person, '')).status, 400);
      await api.prisma.membership.updateMany({ where: { userId: person.id, organizationId: orgB.organizationId }, data: { status: 'INACTIVE' } });
      assert.equal((await setActive(person, orgB.organizationId)).status, 404);
      const response = await fetch(`${api.baseUrl}/api/me/active-organization`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      assert.equal(response.status, 401);
    });

    test('una organizacion archivada se puede dejar como activa (se abre en solo lectura)', async () => {
      const person = await personInAandB('archivada-activa@correo.com');
      await call(owner(orgB), 'POST', `/api/organizations/${orgB.organizationId}/archive`, { confirmName: `Org B ${orgB.secret}` }, orgB.organizationId);
      assert.equal((await setActive(person, orgB.organizationId)).status, 200);
      assert.equal(await currentOf(person), orgB.organizationId);
      await call(owner(orgB), 'POST', `/api/organizations/${orgB.organizationId}/restore`, undefined, orgB.organizationId);
    });

    test('al salir de su organizacion activa, la cuenta pasa a otra donde siga activa', async () => {
      const person = await personInAandB('sale@correo.com');
      await setActive(person, orgB.organizationId);
      assert.equal((await call(person, 'POST', `/api/organizations/${orgB.organizationId}/leave`, undefined, orgB.organizationId)).status, 200);
      const saved = await api.prisma.user.findUniqueOrThrow({ where: { id: person.id } });
      assert.equal(saved.activeOrganizationId, orgA.organizationId);
      assert.equal(await currentOf(person), orgA.organizationId);
    });

    test('si la desactivan, se corrige sola; si no le queda ninguna, queda vacia (bienvenida)', async () => {
      const person = await personInAandB('desactivada@correo.com');
      await setActive(person, orgB.organizationId);
      const membershipB = await api.prisma.membership.findFirstOrThrow({ where: { userId: person.id, organizationId: orgB.organizationId } });
      assert.equal((await call(owner(orgB), 'PATCH', `/api/memberships/${membershipB.id}`, { status: 'INACTIVE' })).status, 200);
      assert.equal((await api.prisma.user.findUniqueOrThrow({ where: { id: person.id } })).activeOrganizationId, orgA.organizationId);

      const membershipA = await api.prisma.membership.findFirstOrThrow({ where: { userId: person.id, organizationId: orgA.organizationId } });
      assert.equal((await call(owner(orgA), 'PATCH', `/api/memberships/${membershipA.id}`, { status: 'INACTIVE' })).status, 200);
      assert.equal((await api.prisma.user.findUniqueOrThrow({ where: { id: person.id } })).activeOrganizationId, null);
      assert.equal(await currentOf(person), undefined);
    });
  });
}
