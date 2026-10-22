import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard, resolveOrganizationId } from './permissions.guard';
import { PermissionsService } from './permissions.service';
import { RequirePermission } from './require-permission.decorator';

class FakeController {
  @RequirePermission('events.delete')
  remove() {}

  @RequirePermission('read', { organizationFrom: { param: 'id' } })
  detail() {}

  open() {}
}

type FakeRequest = Record<string, unknown> & { headers: Record<string, string> };

function makeContext(handler: () => void, request: FakeRequest) {
  return {
    getHandler: () => handler,
    getClass: () => FakeController,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

/** PermissionsService falso: ADMIN puede todo lo de la prueba, MUSICIAN solo 'read'. La regla de archivada es la real. */
function makeGuard(role: 'ADMIN' | 'MUSICIAN', archivedAt: Date | null = null) {
  const calls: unknown[] = [];
  const real = new PermissionsService(null as never);
  const permissions = {
    async assertPermission(userId: string, organizationId: string, permission: string) {
      calls.push({ userId, organizationId, permission });
      if (role === 'MUSICIAN' && permission !== 'read') throw new ForbiddenException('No tienes permiso para hacer esto');
      return { id: 'm1', userId, organizationId, role, status: 'ACTIVE', user: {}, organization: { archivedAt } };
    },
    assertOrganizationWritable: real.assertOrganizationWritable.bind(real),
  } as unknown as PermissionsService;
  return { guard: new PermissionsGuard(new Reflector(), permissions), calls };
}

test('una ruta sin etiqueta pasa sin consultar permisos', async () => {
  const { guard, calls } = makeGuard('MUSICIAN');
  const ok = await guard.canActivate(makeContext(FakeController.prototype.open, { headers: {}, user: { id: 'u1' } }));
  assert.equal(ok, true);
  assert.equal(calls.length, 0);
});

test('verifica el permiso de la etiqueta con la organizacion del header y deja la membresia en la peticion', async () => {
  const { guard, calls } = makeGuard('ADMIN');
  const request: FakeRequest = { headers: { 'x-organization-id': 'org-1' }, user: { id: 'u1' } };
  await guard.canActivate(makeContext(FakeController.prototype.remove, request));
  assert.deepEqual(calls, [{ userId: 'u1', organizationId: 'org-1', permission: 'events.delete' }]);
  assert.deepEqual(request.membership, { id: 'm1', userId: 'u1', organizationId: 'org-1', role: 'ADMIN' });
});

test('si el rol no tiene el permiso responde 403 con el mensaje unico', async () => {
  const { guard } = makeGuard('MUSICIAN');
  await assert.rejects(
    guard.canActivate(makeContext(FakeController.prototype.remove, { headers: { 'x-organization-id': 'org-1' }, user: { id: 'u1' } })),
    /No tienes permiso para hacer esto/,
  );
});

test('puede tomar la organizacion de un parametro de la URL', async () => {
  const { guard, calls } = makeGuard('MUSICIAN');
  await guard.canActivate(makeContext(FakeController.prototype.detail, { headers: { 'x-organization-id': 'otra' }, params: { id: 'org-9' }, user: { id: 'u1' } }));
  assert.deepEqual(calls, [{ userId: 'u1', organizationId: 'org-9', permission: 'read' }]);
});

test('en una organizacion archivada deja leer (GET) pero rechaza cualquier cambio, incluso con permiso read', async () => {
  const { guard } = makeGuard('MUSICIAN', new Date());
  const ok = await guard.canActivate(makeContext(FakeController.prototype.detail, { method: 'GET', headers: {}, params: { id: 'org-9' }, user: { id: 'u1' } }));
  assert.equal(ok, true);
  await assert.rejects(
    guard.canActivate(makeContext(FakeController.prototype.detail, { method: 'POST', headers: {}, params: { id: 'org-9' }, user: { id: 'u1' } })),
    /archivada/,
  );
});

test('resolveOrganizationId: header, header o query, parametro y cuerpo', () => {
  const request = { headers: { 'x-organization-id': 'h' }, query: { organizationId: 'q' }, params: { id: 'p' }, body: { organizationId: 'b' } };
  assert.equal(resolveOrganizationId(request, 'header'), 'h');
  assert.equal(resolveOrganizationId(request, 'headerOrQuery'), 'h');
  assert.equal(resolveOrganizationId({ ...request, headers: {} }, 'headerOrQuery'), 'q');
  assert.equal(resolveOrganizationId({ ...request, headers: {} }, 'header'), '');
  assert.equal(resolveOrganizationId(request, { param: 'id' }), 'p');
  assert.equal(resolveOrganizationId(request, { body: 'organizationId' }), 'b');
  assert.equal(resolveOrganizationId({ headers: {}, body: { organizationId: 42 } }, { body: 'organizationId' }), '');
});
