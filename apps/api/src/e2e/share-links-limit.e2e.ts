/**
 * Limite por ip de la pagina publica de setlists compartidos (en su propio archivo: baja el tope por variable de
 * entorno y no debe frenar a las demas pruebas).
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
  test('limite de enlaces compartidos (e2e)', { skip: MISSING_TEST_DATABASE_MESSAGE }, () => {});
} else {
  describe('limite por ip de la pagina publica: API real contra la base de pruebas', () => {
    let api: TestApp;
    let org: SeededOrg;

    before(async () => {
      process.env.NOTIFICATION_REMINDERS_INTERVAL_MS = 'off';
      process.env.PUBLIC_SHARE_MAX_REQUESTS = '3';
      api = await startTestApp(testDatabaseUrl);
      org = await seedOrganization(api.prisma, 'A');
    });

    after(async () => {
      delete process.env.PUBLIC_SHARE_MAX_REQUESTS;
      await api?.app.close();
    });

    const open = (token: string) => fetch(`${api.baseUrl}/api/public/shared-setlists/${token}`);

    test('pasado el tope, la ip espera (cuentan tambien los tokens inventados) aunque el enlace sea valido', async () => {
      const user = org.users.LEADER;
      const created = await fetch(`${api.baseUrl}/api/setlists/${org.setlistId}/share-links`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${api.sign({ userId: user.userId, email: user.email })}`, 'x-organization-id': org.organizationId, 'Content-Type': 'application/json' },
        body: '{}',
      });
      const { token } = (await created.json()) as { token: string };

      assert.equal((await open('B'.repeat(43))).status, 404);
      assert.equal((await open('C'.repeat(43))).status, 404);
      assert.equal((await open(token)).status, 200, 'la tercera todavia pasa');

      const blocked = await open(token);
      assert.equal(blocked.status, 429);
      assert.equal(blocked.headers.get('cache-control'), 'no-store, private');
      assert.match(((await blocked.json()) as { message: string }).message, /Demasiadas solicitudes/);

      const rows = await api.prisma.publicRequestLimit.findMany();
      assert.equal(rows.length, 1);
      assert.match(rows[0].keyHash, /^[0-9a-f]{64}$/, 'la ip se guarda como hash');
    });
  });
}
