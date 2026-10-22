/**
 * Pruebas e2e del orden de las rutas de canciones: "reorder" tiene que llegar a su handler y no a ":linkId",
 * ":trackId" o ":songFileId" (Express usa el primer patron que coincide, asi que el orden de registro importa).
 * Protegen la division del modulo Canciones en submodulos, que repartio estas rutas en varios controllers.
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

if (!testDatabaseUrl) {
  test('rutas de canciones (e2e)', { skip: MISSING_TEST_DATABASE_MESSAGE }, () => {});
} else {
  describe('rutas de canciones: "reorder" no lo atrapa la ruta con id', () => {
    let api: TestApp;
    let org: SeededOrg;

    before(async () => {
      process.env.NOTIFICATION_REMINDERS_INTERVAL_MS = 'off';
      api = await startTestApp(testDatabaseUrl);
      org = await seedOrganization(api.prisma, 'A');
    });

    after(async () => {
      await api?.app.close();
    });

    async function patch(path: string, body: unknown) {
      const owner = org.users.OWNER;
      const response = await fetch(`${api.baseUrl}${path}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${api.sign({ userId: owner.userId, email: owner.email })}`,
          'Content-Type': 'application/json',
          'x-organization-id': org.organizationId,
        },
        body: JSON.stringify(body),
      });
      const text = await response.text();
      return { status: response.status, body: text ? JSON.parse(text) : {} };
    }

    const cases = [
      { what: 'enlaces', segment: 'links', id: () => org.linkId },
      { what: 'pistas', segment: 'tracks', id: () => org.trackId },
      { what: 'archivos', segment: 'files', id: () => org.songFileId },
    ];

    for (const { what, segment, id } of cases) {
      test(`PATCH .../${segment}/reorder ordena ${what} (y sin "items" responde el error del reorden, no un 404)`, async () => {
        const path = `/api/songs/${org.songId}/${segment}/reorder`;
        const invalid = await patch(path, {});
        assert.equal(invalid.status, 400, `si lo atrapara la ruta con id, "reorder" seria un id inexistente (404): ${JSON.stringify(invalid.body)}`);

        const ordered = await patch(path, { items: [{ id: id(), sortOrder: 0 }] });
        assert.equal(ordered.status, 200, JSON.stringify(ordered.body));
        assert.ok(Array.isArray(ordered.body), 'el reorden devuelve la lista ordenada');
        assert.deepEqual(ordered.body.map((row: { id: string }) => row.id), [id()]);
      });
    }
  });
}
