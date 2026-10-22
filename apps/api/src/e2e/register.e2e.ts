/**
 * Pruebas e2e del registro: se crea la cuenta sin crear ninguna organizacion, y esa cuenta ya puede usar su
 * sesion, "Mi perfil", "Mis invitaciones" y sus fechas no disponibles.
 */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { config } from 'dotenv';
import { getTestDatabaseUrl, MISSING_TEST_DATABASE_MESSAGE } from './test-database';
import { startTestApp, type TestApp } from './test-app';

config({ path: resolve(__dirname, '../../../../.env'), quiet: true });
const testDatabaseUrl = getTestDatabaseUrl();

if (!testDatabaseUrl) {
  test('registro sin organizacion (e2e)', { skip: MISSING_TEST_DATABASE_MESSAGE }, () => {});
} else {
  describe('registro: la cuenta existe sin organizacion', () => {
    let api: TestApp;

    before(async () => {
      process.env.NOTIFICATION_REMINDERS_INTERVAL_MS = 'off';
      api = await startTestApp(testDatabaseUrl);
    });

    after(async () => {
      await api?.app.close();
    });

    async function call(method: string, path: string, options: { token?: string; body?: unknown } = {}) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (options.token) headers.Authorization = `Bearer ${options.token}`;
      const response = await fetch(`${api.baseUrl}${path}`, { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
      const text = await response.text();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- respuestas JSON variadas
      return { status: response.status, body: (text ? JSON.parse(text) : {}) as any };
    }

    test('crear cuenta no crea organizacion y la sesion funciona igual', async () => {
      const registered = await call('POST', '/api/auth/register', {
        body: { name: 'Persona Nueva', email: 'Nueva@Correo.test', password: 'clave-segura-1', confirmPassword: 'clave-segura-1' },
      });
      assert.equal(registered.status, 201);
      assert.equal(registered.body.next, 'onboarding', 'la web la lleva a la bienvenida (crear organizacion es opcional)');
      assert.ok(registered.body.accessToken);
      assert.equal(registered.body.user.currentOrganizationId ?? null, null);

      const stored = await api.prisma.user.findUniqueOrThrow({ where: { email: 'nueva@correo.test' }, include: { memberships: true } });
      assert.equal(stored.name, 'Persona Nueva');
      assert.equal(stored.memberships.length, 0);
      assert.equal(await api.prisma.organization.count(), 0, 'no se creo ninguna organizacion');

      const token = registered.body.accessToken as string;
      const me = await call('GET', '/api/auth/me', { token });
      assert.equal(me.status, 200);
      assert.deepEqual(me.body.user.organizations, []);

      assert.equal((await call('GET', '/api/me/invitations', { token })).status, 200);
      assert.equal((await call('PATCH', '/api/me', { token, body: { phone: '555-0000' } })).status, 200);
      assert.equal((await call('PUT', '/api/me/instruments', { token, body: { instruments: [{ instrument: 'KEYS' }] } })).status, 200);
      assert.equal((await call('POST', '/api/me/unavailability', { token, body: { startsOn: '2026-12-24', endsOn: '2026-12-24' } })).status, 201);

      // Y despues puede entrar con su correo y contraseña, todavia sin organizacion.
      const login = await call('POST', '/api/login', { body: { email: 'nueva@correo.test', password: 'clave-segura-1' } });
      assert.equal(login.status, 201);
      assert.equal(login.body.next, 'onboarding');
    });

    test('el mismo correo no se registra dos veces', async () => {
      const again = await call('POST', '/api/auth/register', { body: { name: 'Otra', email: 'nueva@correo.test', password: 'clave-segura-2', confirmPassword: 'clave-segura-2' } });
      assert.equal(again.status, 409);
    });
  });
}
