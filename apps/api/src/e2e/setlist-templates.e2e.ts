/**
 * Pruebas e2e de plantillas de setlist: guardar un setlist como plantilla, crear uno desde ella (copia items y
 * requisitos, empieza en borrador), editar y borrar la plantilla, y quien puede hacer cada cosa.
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
  test('plantillas de setlist (e2e)', { skip: MISSING_TEST_DATABASE_MESSAGE }, () => {});
} else {
  describe('plantillas de setlist: API real contra la base de pruebas', () => {
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

    async function call(o: SeededOrg, role: Role, method: string, path: string, body?: unknown) {
      const user = o.users[role];
      const response = await fetch(`${api.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${api.sign({ userId: user.userId, email: user.email })}`, 'x-organization-id': o.organizationId, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await response.text();
      return { status: response.status, body: text ? JSON.parse(text) : {} };
    }

    test('guardar como plantilla y crear un setlist desde ella', async () => {
      const saved = await call(org, 'LEADER', 'POST', `/api/setlists/${org.setlistId}/save-as-template`, { name: 'Plantilla domingo' });
      assert.equal(saved.status, 201);
      assert.equal(saved.body.isTemplate, true);
      assert.equal(saved.body.items.length, 1);

      const templates = await call(org, 'GUEST', 'GET', '/api/setlists?isTemplate=true');
      assert.deepEqual(templates.body.items.map((row: { id: string }) => row.id), [saved.body.id]);
      const setlists = await call(org, 'GUEST', 'GET', '/api/setlists');
      assert.ok(!setlists.body.items.some((row: { id: string }) => row.id === saved.body.id), 'las plantillas no salen entre los setlists');

      const created = await call(org, 'LEADER', 'POST', '/api/setlists', { name: 'Domingo 15', sourceTemplateId: saved.body.id });
      assert.equal(created.status, 201);
      assert.equal(created.body.isTemplate, false);
      assert.equal(created.body.status, 'DRAFT');
      assert.equal(created.body.items.length, 1);
      assert.equal(created.body.items[0].title, saved.body.items[0].title);

      // Un setlist normal no sirve de origen, ni una plantilla de otra organizacion.
      assert.equal((await call(org, 'LEADER', 'POST', '/api/setlists', { name: 'x', sourceTemplateId: org.setlistId })).status, 400);
      const foreign = await call(other, 'OWNER', 'POST', `/api/setlists/${other.setlistId}/save-as-template`, { name: 'Ajena' });
      assert.equal((await call(org, 'LEADER', 'POST', '/api/setlists', { name: 'x', sourceTemplateId: foreign.body.id })).status, 404);
    });

    test('una plantilla se edita y se borra, pero no se publica ni se archiva', async () => {
      const template = (await call(org, 'OWNER', 'POST', `/api/setlists/${org.setlistId}/save-as-template`, { name: 'Plantilla ensayo' })).body;
      const renamed = await call(org, 'LEADER', 'PATCH', `/api/setlists/${template.id}`, { name: 'Plantilla ensayo general' });
      assert.equal(renamed.status, 200);
      assert.equal(renamed.body.name, 'Plantilla ensayo general');
      assert.equal((await call(org, 'OWNER', 'POST', `/api/setlists/${template.id}/publish`)).status, 400);
      assert.equal((await call(org, 'OWNER', 'POST', `/api/setlists/${template.id}/archive`)).status, 400);
      assert.equal((await call(org, 'ADMIN', 'DELETE', `/api/setlists/${template.id}`)).status, 200);
      assert.equal((await call(org, 'ADMIN', 'GET', `/api/setlists/${template.id}`)).status, 404);
    });

    test('musicos e invitados no crean, editan ni borran plantillas', async () => {
      const template = (await call(org, 'OWNER', 'POST', `/api/setlists/${org.setlistId}/save-as-template`, { name: 'Plantilla protegida' })).body;
      for (const role of ['MUSICIAN', 'GUEST'] as const) {
        assert.equal((await call(org, role, 'POST', `/api/setlists/${org.setlistId}/save-as-template`, { name: 'x' })).status, 403);
        assert.equal((await call(org, role, 'POST', '/api/setlists', { name: 'x', sourceTemplateId: template.id })).status, 403);
        assert.equal((await call(org, role, 'PATCH', `/api/setlists/${template.id}`, { name: 'x' })).status, 403);
        assert.equal((await call(org, role, 'DELETE', `/api/setlists/${template.id}`)).status, 403);
      }
      assert.equal((await call(org, 'LEADER', 'DELETE', `/api/setlists/${template.id}`)).status, 403, 'borrar es de administradores');
    });
  });
}
