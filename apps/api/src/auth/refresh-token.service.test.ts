import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { hashRefreshToken, RefreshTokenService, ROTATION_GRACE_MS } from './refresh-token.service';

type Row = {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedById: string | null;
  userAgent: string | null;
};
type Where = Partial<{ userId: string; familyId: string; tokenHash: string; revokedAt: null; expiresAt: { lt: Date } }>;

/** Prisma falso en memoria con lo que usa RefreshTokenService. */
function makeService() {
  const rows: Row[] = [];
  let counter = 0;
  const matches = (row: Row, where: Where) =>
    (where.userId === undefined || row.userId === where.userId) &&
    (where.familyId === undefined || row.familyId === where.familyId) &&
    (where.tokenHash === undefined || row.tokenHash === where.tokenHash) &&
    (where.revokedAt === undefined || row.revokedAt === null) &&
    (where.expiresAt === undefined || row.expiresAt < where.expiresAt.lt);
  const refreshToken = {
    async create({ data }: { data: Omit<Row, 'id' | 'revokedAt' | 'replacedById'> }) {
      const row = { ...data, id: `rt${++counter}`, revokedAt: null, replacedById: null };
      rows.push(row);
      return row;
    },
    async findUnique({ where }: { where: { tokenHash: string } }) {
      return rows.find((row) => row.tokenHash === where.tokenHash) ?? null;
    },
    async update({ where, data }: { where: { id: string }; data: Partial<Row> }) {
      const row = rows.find((item) => item.id === where.id)!;
      Object.assign(row, data);
      return row;
    },
    async updateMany({ where, data }: { where: Where; data: Partial<Row> }) {
      const targets = rows.filter((row) => matches(row, where));
      targets.forEach((row) => Object.assign(row, data));
      return { count: targets.length };
    },
    async deleteMany({ where }: { where: Where }) {
      const before = rows.length;
      for (let i = rows.length - 1; i >= 0; i--) if (matches(rows[i], where)) rows.splice(i, 1);
      return { count: before - rows.length };
    },
    async count({ where }: { where: Where }) {
      return rows.filter((row) => matches(row, where)).length;
    },
  };
  const prisma = { refreshToken, $transaction: (fn: (tx: unknown) => unknown) => fn({ refreshToken }) };
  return { service: new RefreshTokenService(prisma as unknown as PrismaService), rows };
}

test('issue guarda solo el hash y empieza una familia nueva por login', async () => {
  const { service, rows } = makeService();
  const first = await service.issue('u1', 'Chrome');
  const second = await service.issue('u1', 'Firefox');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].tokenHash, hashRefreshToken(first.token));
  assert.ok(!rows.some((row) => JSON.stringify(row).includes(first.token)), 'el token en claro no se guarda');
  assert.notEqual(rows[0].familyId, rows[1].familyId);
  assert.ok(first.expiresAt.getTime() > Date.now() + 29 * 86_400_000);
  assert.notEqual(first.token, second.token);
});

test('rotate entrega un token nuevo de la misma familia y deja el viejo marcado como reemplazado', async () => {
  const { service, rows } = makeService();
  const original = await service.issue('u1');
  const rotated = await service.rotate(original.token);
  assert.equal(rotated.userId, 'u1');
  assert.notEqual(rotated.token, original.token);
  const [old, next] = rows;
  assert.equal(old.replacedById, next.id);
  assert.ok(old.revokedAt);
  assert.equal(next.familyId, old.familyId);
  // El nuevo sigue funcionando.
  assert.equal((await service.rotate(rotated.token)).userId, 'u1');
});

test('reusar un token ya rotado (pasada la ventana de gracia) revoca toda la familia', async () => {
  const { service, rows } = makeService();
  const original = await service.issue('u1');
  const otherLogin = await service.issue('u1');
  const rotated = await service.rotate(original.token);
  rows[0].revokedAt = new Date(Date.now() - ROTATION_GRACE_MS - 1000);

  await assert.rejects(service.rotate(original.token), /Sesion invalida/);
  await assert.rejects(service.rotate(rotated.token), UnauthorizedException);
  // Otra sesion (otro login, otra familia) no se toca.
  assert.equal((await service.rotate(otherLogin.token)).userId, 'u1');
});

test('dentro de la ventana de gracia (dos pestañas a la vez) se emite otro token sin revocar la familia', async () => {
  const { service } = makeService();
  const original = await service.issue('u1');
  const firstTab = await service.rotate(original.token);
  const secondTab = await service.rotate(original.token);
  assert.notEqual(secondTab.token, firstTab.token);
  assert.equal((await service.rotate(firstTab.token)).userId, 'u1');
  assert.equal((await service.rotate(secondTab.token)).userId, 'u1');
});

test('un token vencido, desconocido o vacio no renueva la sesion', async () => {
  const { service, rows } = makeService();
  const original = await service.issue('u1');
  rows[0].expiresAt = new Date(Date.now() - 1000);
  await assert.rejects(service.rotate(original.token), /Sesion expirada/);
  await assert.rejects(service.rotate('inventado'), /Sesion expirada/);
  await assert.rejects(service.rotate(null), UnauthorizedException);
});

test('revoke (logout) cierra la sesion; un token revocado ya no sirve', async () => {
  const { service } = makeService();
  const original = await service.issue('u1');
  const rotated = await service.rotate(original.token);
  await service.revoke(rotated.token);
  await assert.rejects(service.rotate(rotated.token), UnauthorizedException);
  await service.revoke('no-existe');
  await service.revoke(null);
});

test('al emitir se borran los tokens vencidos de esa persona', async () => {
  const { service, rows } = makeService();
  await service.issue('u1');
  rows[0].expiresAt = new Date(Date.now() - 1000);
  await service.issue('u1');
  assert.equal(rows.length, 1);
});
