import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import type { LiveStageState } from '@harmonyhub/contracts';
import { PermissionsService } from '../../permissions/permissions.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { SetlistsAccessService } from '../setlists-access.service';
import { LiveStageError, LiveStageHub } from './live-stage.hub';
import { LiveStageService } from './live-stage.service';

const ana = { userId: 'u-ana', membershipId: 'm-ana', name: 'Ana' };
const beto = { userId: 'u-beto', membershipId: 'm-beto', name: 'Beto' };

function hubWithClock() {
  const hub = new LiveStageHub();
  let tick = 0;
  hub.now = () => new Date(Date.UTC(2026, 9, 22, 20, 0, tick++));
  return hub;
}

function listen(hub: LiveStageHub, organizationId = 'org', setlistId = 's1') {
  const received: LiveStageState[] = [];
  let closed = false;
  const unsubscribe = hub.subscribe(organizationId, setlistId, { send: (state) => received.push(state), close: () => (closed = true) });
  return { received, unsubscribe, isClosed: () => closed };
}

test('al conectarse se recibe el estado actual; despues, cada cambio del lider', () => {
  const hub = hubWithClock();
  const device = listen(hub);
  assert.deepEqual(device.received, [{ live: false, setlistId: 's1' }]);

  hub.start('org', 's1', ana, { currentItemId: 'i1' });
  hub.advance('org', 's1', ana.userId, 'i2');
  hub.advance('org', 's1', ana.userId, 'i2'); // mismo item: no se repite el aviso
  hub.end('org', 's1', ana.userId);

  assert.deepEqual(
    device.received.map((state) => (state.live ? [state.currentItemId, state.version, state.leader.name] : 'fin')),
    ['fin', ['i1', 1, 'Ana'], ['i2', 2, 'Ana'], 'fin'],
  );
});

test('un solo lider: otro con permiso recibe CONFLICT con quien dirige, salvo que tome el liderazgo', () => {
  const hub = hubWithClock();
  hub.start('org', 's1', ana, { currentItemId: 'i3' });
  assert.throws(
    () => hub.start('org', 's1', beto),
    (error: unknown) => error instanceof LiveStageError && error.code === 'CONFLICT' && error.leader?.name === 'Ana',
  );
  // Ana vuelve a iniciar (otra pestana): no se reinicia nada.
  assert.equal((hub.start('org', 's1', ana) as { version: number }).version, 1);

  const taken = hub.start('org', 's1', beto, { takeOver: true });
  assert.ok(taken.live);
  assert.equal(taken.leader.name, 'Beto');
  assert.equal(taken.currentItemId, 'i3', 'tomar el liderazgo conserva donde iba la sesion');
  assert.throws(() => hub.advance('org', 's1', ana.userId, 'i4'), (error: unknown) => error instanceof LiveStageError && error.code === 'NOT_LEADER');
});

test('pasar el liderazgo y terminar: solo quien dirige; sin sesion no hay nada que avanzar', () => {
  const hub = hubWithClock();
  assert.throws(() => hub.advance('org', 's1', ana.userId, 'i1'), (error: unknown) => error instanceof LiveStageError && error.code === 'NOT_LIVE');
  hub.start('org', 's1', ana);
  assert.throws(() => hub.handover('org', 's1', beto.userId, beto), /Solo quien dirige/);
  const handed = hub.handover('org', 's1', ana.userId, beto);
  assert.ok(handed.live && handed.leader.userId === beto.userId);
  assert.throws(() => hub.end('org', 's1', ana.userId), /Solo quien dirige/);
  assert.deepEqual(hub.end('org', 's1', beto.userId), { live: false, setlistId: 's1' });
});

test('organizaciones y setlists separados; un dispositivo caido no corta a los demas; al apagar se cierran los streams', () => {
  const hub = hubWithClock();
  const sameSetlistOtherOrg = listen(hub, 'org-b', 's1');
  const otherSetlist = listen(hub, 'org', 's2');
  const broken = hub.subscribe('org', 's1', {
    send: (state) => {
      if (state.live) throw new Error('socket cerrado');
    },
    close: () => {},
  });
  const healthy = listen(hub);
  hub.start('org', 's1', ana);
  assert.equal(healthy.received.length, 2);
  assert.equal(sameSetlistOtherOrg.received.length, 1);
  assert.equal(otherSetlist.received.length, 1);
  assert.equal(hub.state('org-b', 's1').live, false);

  broken();
  healthy.unsubscribe();
  assert.equal(hub.subscriberCount('org', 's1'), 0);
  hub.onModuleDestroy();
  assert.ok(sameSetlistOtherOrg.isClosed() && otherSetlist.isClosed());
  assert.equal(hub.state('org', 's1').live, false);
});

// ---- Servicio: quien puede dirigir y como se traducen los errores ----

function makeService(memberships: Record<string, { role: 'OWNER' | 'ADMIN' | 'LEADER' | 'MUSICIAN' | 'GUEST'; userId: string; name: string }>) {
  const hub = hubWithClock();
  const access = { assertSetlistInOrg: async () => ({ id: 's1' }), assertItemInSetlist: async () => ({ id: 'i1' }) };
  const prisma = {
    membership: {
      findFirst: async ({ where }: { where: { id: string } }) => {
        const found = memberships[where.id];
        return found ? { id: where.id, role: found.role, userId: found.userId, user: { name: found.name } } : null;
      },
    },
  };
  const service = new LiveStageService(hub, access as unknown as SetlistsAccessService, prisma as unknown as PrismaService, new PermissionsService(prisma as unknown as PrismaService));
  return { service, hub };
}

test('el servicio: 409 con quien dirige, 403 si no dirige, y solo se pasa el liderazgo a quien puede dirigir', async () => {
  const { service } = makeService({
    'm-ana': { role: 'LEADER', userId: 'u-ana', name: 'Ana' },
    'm-beto': { role: 'ADMIN', userId: 'u-beto', name: 'Beto' },
    'm-musico': { role: 'MUSICIAN', userId: 'u-musico', name: 'Musico' },
  });
  const anaMember = { id: 'm-ana', userId: 'u-ana', organizationId: 'org', role: 'LEADER' as const };
  const betoMember = { id: 'm-beto', userId: 'u-beto', organizationId: 'org', role: 'ADMIN' as const };

  await service.start(anaMember, 's1', { currentItemId: 'i1' });
  await assert.rejects(service.start(betoMember, 's1', {}), (error: unknown) => {
    assert.ok(error instanceof ConflictException);
    assert.deepEqual((error.getResponse() as { leader: unknown }).leader, { userId: 'u-ana', membershipId: 'm-ana', name: 'Ana' });
    return true;
  });
  await assert.rejects(service.advance(betoMember, 's1', { currentItemId: 'i1' }), ForbiddenException);
  await assert.rejects(service.handover(anaMember, 's1', { membershipId: 'm-musico' }), BadRequestException);
  const handed = await service.handover(anaMember, 's1', { membershipId: 'm-beto' });
  assert.ok(handed.live && handed.leader.name === 'Beto');
  await assert.rejects(service.end(anaMember, 's1'), ForbiddenException);
  assert.deepEqual(await service.end(betoMember, 's1'), { live: false, setlistId: 's1' });
  await assert.rejects(service.advance(betoMember, 's1', { currentItemId: 'i1' }), ConflictException);
});
