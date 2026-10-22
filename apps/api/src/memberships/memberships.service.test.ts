import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PermissionsService } from '../permissions/permissions.service';
import type { PrismaService } from '../prisma/prisma.service';
import { updateMembershipSchema } from '@harmonyhub/contracts';
import { viaPipe } from '../shared/zod-pipe.test-utils';
import { MembershipsService } from './memberships.service';

type FakeMembership = { id: string; userId: string; organizationId: string; role: string; status: string };
type FindUniqueArgs = { where: { id?: string; userId_organizationId?: { userId: string; organizationId: string } } };
type CountArgs = { where: { organizationId: string; role: string; status: string; id: { not: string } } };
type UpdateArgs = { where: { id: string }; data: Record<string, unknown> };

/** Prisma falso en memoria con lo minimo que usan PermissionsService y MembershipsService.update. */
function makeService(memberships: FakeMembership[]) {
  const updates: { id: string; data: unknown }[] = [];
  const prisma = {
    membership: {
      async findUnique({ where }: FindUniqueArgs) {
        // Incluye la organizacion (no archivada), como la consulta real.
        const withOrganization = (m?: FakeMembership) => (m ? { ...m, organization: { archivedAt: null } } : null);
        if (where.id) return withOrganization(memberships.find((m) => m.id === where.id));
        const { userId, organizationId } = where.userId_organizationId!;
        return withOrganization(memberships.find((m) => m.userId === userId && m.organizationId === organizationId));
      },
      async count({ where }: CountArgs) {
        return memberships.filter((m) => m.organizationId === where.organizationId && m.role === where.role && m.status === where.status && m.id !== where.id.not).length;
      },
      async update({ where, data }: UpdateArgs) {
        updates.push({ id: where.id, data });
        return { ...memberships.find((m) => m.id === where.id), ...data };
      },
      async findFirst() {
        return null;
      },
    },
    // Nadie tiene guardada una organizacion activa en estas pruebas (repointActiveOrganization no cambia nada).
    user: {
      async findUnique() {
        return { activeOrganizationId: null };
      },
      async update() {
        return {};
      },
    },
    $transaction(fn: (tx: unknown) => unknown) {
      return fn(prisma);
    },
  };
  const fakePrisma = prisma as unknown as PrismaService;
  const permissions = new PermissionsService(fakePrisma);
  const service = new MembershipsService(fakePrisma, permissions);
  // Como en la API: el cuerpo pasa por ZodPipe con el esquema del contrato antes de llegar al servicio.
  const api = { update: (userId: string, id: string, raw: unknown) => viaPipe(updateMembershipSchema, raw, (data) => service.update(userId, id, data)) };
  return { service: api, updates };
}

const org = 'org-1';
const team: FakeMembership[] = [
  { id: 'm-owner', userId: 'owner', organizationId: org, role: 'OWNER', status: 'ACTIVE' },
  { id: 'm-admin', userId: 'admin', organizationId: org, role: 'ADMIN', status: 'ACTIVE' },
  { id: 'm-musician', userId: 'musician', organizationId: org, role: 'MUSICIAN', status: 'ACTIVE' },
];

test('solo un OWNER puede nombrar a otro OWNER', async () => {
  const { service, updates } = makeService(team.map((m) => ({ ...m })));
  await service.update('owner', 'm-musician', { role: 'OWNER' });
  assert.deepEqual(updates, [{ id: 'm-musician', data: { role: 'OWNER', status: undefined } }]);
});

test('un ADMIN no puede ascender a nadie a OWNER, ni a si mismo', async () => {
  const { service, updates } = makeService(team.map((m) => ({ ...m })));
  await assert.rejects(service.update('admin', 'm-musician', { role: 'OWNER' }), /Solo un propietario/);
  await assert.rejects(service.update('admin', 'm-admin', { role: 'OWNER' }), ForbiddenException);
  assert.equal(updates.length, 0);
});

test('un ADMIN si puede cambiar otros roles y el estado de quien no es OWNER', async () => {
  const { service, updates } = makeService(team.map((m) => ({ ...m })));
  await service.update('admin', 'm-musician', { role: 'LEADER' });
  await service.update('admin', 'm-musician', { status: 'INACTIVE' });
  assert.equal(updates.length, 2);
});

test('se mantienen las reglas: ADMIN no toca a un OWNER y nunca queda la organizacion sin OWNER', async () => {
  const { service, updates } = makeService(team.map((m) => ({ ...m })));
  await assert.rejects(service.update('admin', 'm-owner', { status: 'INACTIVE' }), /no puede modificar un OWNER/);
  await assert.rejects(service.update('owner', 'm-owner', { role: 'ADMIN' }), /ultimo OWNER/);
  await assert.rejects(service.update('musician', 'm-admin', { role: 'MUSICIAN' }), /No tienes permiso para hacer esto/);
  assert.equal(updates.length, 0);
});

test('el instrumento ya no se guarda en la membresia y un rol invalido se rechaza', async () => {
  const { service, updates } = makeService(team.map((m) => ({ ...m })));
  await service.update('owner', 'm-musician', { instrument: 'Guitarra', role: 'LEADER' });
  assert.deepEqual(updates, [{ id: 'm-musician', data: { role: 'LEADER', status: undefined } }]);
  await assert.rejects(service.update('owner', 'm-musician', { role: 'REY' }), BadRequestException);
});
