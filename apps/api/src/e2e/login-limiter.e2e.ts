/**
 * Pruebas e2e del limitador de login guardado en Postgres: dos instancias de la API contra la misma base
 * comparten los intentos fallidos (lo que el limitador en memoria no podia hacer).
 */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { config } from 'dotenv';
import { hashPassword } from '../auth/password';
import { getTestDatabaseUrl, MISSING_TEST_DATABASE_MESSAGE } from './test-database';
import { startTestApp, type TestApp } from './test-app';

config({ path: resolve(__dirname, '../../../../.env'), quiet: true });
const testDatabaseUrl = getTestDatabaseUrl();

if (!testDatabaseUrl) {
  test('limitador de login compartido (e2e)', { skip: MISSING_TEST_DATABASE_MESSAGE }, () => {});
} else {
  describe('limitador de login: dos instancias de la API comparten los intentos', () => {
    let first: TestApp;
    let second: TestApp;
    const password = 'clave-correcta-123';

    before(async () => {
      first = await startTestApp(testDatabaseUrl);
      second = await startTestApp(testDatabaseUrl, { reset: false });
      for (const email of ['bloqueo@e2e.test', 'exito@e2e.test', 'carrera@e2e.test']) {
        await first.prisma.user.create({ data: { name: email, email, passwordHash: hashPassword(password) } });
      }
    });

    after(async () => {
      await second?.app.close();
      await first?.app.close();
    });

    async function login(instance: TestApp, email: string, pass: string) {
      const response = await fetch(`${instance.baseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      return { status: response.status, body: (await response.json()) as { message?: string } };
    }

    test('5 fallos repartidos entre las dos instancias bloquean en ambas (429), incluso con la clave correcta', async () => {
      const email = 'bloqueo@e2e.test';
      const statuses = [];
      for (let attempt = 0; attempt < 5; attempt += 1) statuses.push((await login(attempt % 2 ? second : first, email, 'mala')).status);
      assert.deepEqual(statuses, [401, 401, 401, 401, 401]);

      const blockedOnFirst = await login(first, email, password);
      const blockedOnSecond = await login(second, email, password);
      assert.equal(blockedOnFirst.status, 429);
      assert.equal(blockedOnSecond.status, 429);
      assert.match(String(blockedOnSecond.body.message), /Demasiados intentos de inicio de sesion\. Intenta de nuevo en 15 min\./);
    });

    test('un login correcto en la otra instancia limpia los fallos', async () => {
      const email = 'exito@e2e.test';
      for (let attempt = 0; attempt < 4; attempt += 1) assert.equal((await login(first, email, 'mala')).status, 401);
      assert.equal((await login(second, email, password)).status, 201);
      // Empezo de cero: hacen falta otros 5 fallos para bloquear.
      for (let attempt = 0; attempt < 4; attempt += 1) assert.equal((await login(second, email, 'mala')).status, 401);
      assert.equal((await login(first, email, password)).status, 201);
    });

    test('fallos simultaneos en las dos instancias se cuentan todos (sin perder ninguno)', async () => {
      const email = 'carrera@e2e.test';
      const results = await Promise.all(Array.from({ length: 5 }, (_unused, index) => login(index % 2 ? second : first, email, 'mala')));
      assert.ok(results.every((result) => result.status === 401));
      assert.equal((await login(second, email, password)).status, 429);
    });

    test('en la base no queda el correo ni la ip en claro', async () => {
      const rows = await first.prisma.loginAttempt.findMany();
      assert.ok(rows.length >= 1);
      assert.ok(rows.every((row) => /^[0-9a-f]{64}$/.test(row.keyHash)));
      assert.ok(!JSON.stringify(rows).includes('@e2e.test'));
    });
  });
}
