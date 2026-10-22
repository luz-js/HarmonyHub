/**
 * Pruebas e2e de renovacion de sesion: registro/login entregan el refresh token en una cookie httpOnly,
 * /api/auth/refresh lo rota, reusar uno viejo cierra la sesion y /api/auth/logout lo revoca.
 */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { after, before, describe, test } from 'node:test';
import type { INestApplication } from '@nestjs/common';
import { config } from 'dotenv';
import type { PrismaService } from '../prisma/prisma.service';
import { getTestDatabaseUrl, MISSING_TEST_DATABASE_MESSAGE } from './test-database';
import { startTestApp } from './test-app';

config({ path: resolve(__dirname, '../../../../.env'), quiet: true });
const testDatabaseUrl = getTestDatabaseUrl();

type HttpResult = { status: number; body: Record<string, unknown>; setCookie: string | null; text: string };

if (!testDatabaseUrl) {
  test('renovacion de sesion (e2e)', { skip: MISSING_TEST_DATABASE_MESSAGE }, () => {});
} else {
  describe('renovacion de sesion con refresh token: API real contra la base de pruebas', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let baseUrl = '';
    const credentials = { name: 'Luz Prueba', email: 'refresh@e2e.test', password: 'clave-segura-123', confirmPassword: 'clave-segura-123' };

    before(async () => {
      ({ app, prisma, baseUrl } = await startTestApp(testDatabaseUrl));
    });

    after(async () => {
      await app?.close();
    });

    async function post(path: string, options: { body?: unknown; cookie?: string | null } = {}): Promise<HttpResult> {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (options.cookie) headers.Cookie = options.cookie;
      const response = await fetch(`${baseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(options.body ?? {}) });
      const text = await response.text();
      return { status: response.status, text, body: text ? JSON.parse(text) : {}, setCookie: response.headers.getSetCookie().find((value) => value.startsWith('hh_refresh=')) ?? null };
    }

    /** "hh_refresh=abc; Path=/api/auth; ..." -> "hh_refresh=abc" (lo que el navegador mandaria de vuelta). */
    const cookieOf = (setCookie: string | null) => setCookie?.split(';')[0] ?? null;

    async function me(accessToken: unknown) {
      const response = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${String(accessToken)}` } });
      return response.status;
    }

    let firstCookie: string | null = null;
    let secondCookie: string | null = null;

    test('el registro entrega un access token corto y el refresh token solo en una cookie httpOnly', async () => {
      const result = await post('/api/auth/register', { body: credentials });
      assert.equal(result.status, 201);
      assert.ok(result.setCookie, 'falta la cookie hh_refresh');
      assert.match(result.setCookie!, /HttpOnly/i);
      assert.match(result.setCookie!, /SameSite=Lax/i);
      assert.match(result.setCookie!, /Path=\/api\/auth/i);
      firstCookie = cookieOf(result.setCookie);
      const refreshValue = firstCookie!.split('=')[1];
      assert.ok(!result.text.includes(refreshValue), 'el refresh token no debe ir en el cuerpo');

      const payload = JSON.parse(Buffer.from(String(result.body.accessToken).split('.')[1], 'base64url').toString('utf8'));
      const ttl = payload.exp - Math.floor(Date.now() / 1000);
      assert.ok(ttl > 0 && ttl <= 15 * 60 + 5, `el access token dura ${ttl}s, deberia ser ~15 min`);
      assert.equal(await me(result.body.accessToken), 200);
    });

    test('refresh rota la cookie y entrega un access token que funciona', async () => {
      const result = await post('/api/auth/refresh', { cookie: firstCookie });
      assert.equal(result.status, 200);
      secondCookie = cookieOf(result.setCookie);
      assert.ok(secondCookie && secondCookie !== firstCookie, 'la cookie tiene que cambiar en cada renovacion');
      assert.equal(await me(result.body.accessToken), 200);
    });

    test('sin cookie o con una inventada responde 401', async () => {
      assert.equal((await post('/api/auth/refresh')).status, 401);
      assert.equal((await post('/api/auth/refresh', { cookie: 'hh_refresh=inventada' })).status, 401);
    });

    test('reusar una cookie ya rotada cierra toda esa sesion (tambien la cookie nueva)', async () => {
      // Se simula que la rotacion fue hace un minuto (fuera de la ventana de gracia de 20 s).
      await prisma.refreshToken.updateMany({ where: { replacedById: { not: null } }, data: { revokedAt: new Date(Date.now() - 60_000) } });
      const reused = await post('/api/auth/refresh', { cookie: firstCookie });
      assert.equal(reused.status, 401);
      assert.match(String(reused.body.message), /Sesion invalida/);
      assert.equal((await post('/api/auth/refresh', { cookie: secondCookie })).status, 401);
    });

    test('logout revoca la sesion y borra la cookie', async () => {
      const login = await post('/api/login', { body: { email: credentials.email, password: credentials.password } });
      assert.equal(login.status, 201);
      const cookie = cookieOf(login.setCookie);
      const logout = await post('/api/auth/logout', { cookie });
      assert.equal(logout.status, 200);
      assert.match(logout.setCookie ?? '', /Expires=Thu, 01 Jan 1970/i);
      assert.equal((await post('/api/auth/refresh', { cookie })).status, 401);
      // Logout sin cookie tampoco falla.
      assert.equal((await post('/api/auth/logout')).status, 200);
    });

    test('en la base solo se guardan hashes', async () => {
      const rows = await prisma.refreshToken.findMany();
      assert.ok(rows.length >= 3);
      const values = [firstCookie, secondCookie].map((cookie) => cookie!.split('=')[1]);
      assert.ok(!rows.some((row) => values.includes(row.tokenHash)), 'el token en claro no debe estar en la base');
    });
  });
}
