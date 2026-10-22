import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import type { ProfileRepository } from './profile.repository';
import { ProfileService } from './profile.service';
import { normalizeInstruments, sortInstruments } from './profile.utils';

/** Repositorio falso: registra lo que el servicio le pide y devuelve algo con la forma de Prisma. */
function makeService() {
  const calls: { updateUser: unknown[]; replaceInstruments: unknown[]; setActiveOrganization: unknown[] } = { updateUser: [], replaceInstruments: [], setActiveOrganization: [] };
  const repository = {
    async updateUser(userId: string, data: { name?: string; phone?: string | null }) {
      calls.updateUser.push({ userId, data });
      return { id: userId, name: data.name ?? 'Ana', email: 'ana@x.com', phone: data.phone ?? null, avatarUrl: null };
    },
    async replaceInstruments(userId: string, instruments: { instrument: string; isPrimary: boolean }[]) {
      calls.replaceInstruments.push({ userId, instruments });
      return instruments.map((item, index) => ({ id: `i${index}`, ...item, createdAt: new Date(2026, 0, index + 1) }));
    },
    // La persona solo es miembro activo de org-1.
    async findActiveMembership(userId: string, organizationId: string) {
      return organizationId === 'org-1' ? { id: 'm1' } : null;
    },
    async setActiveOrganization(userId: string, organizationId: string) {
      calls.setActiveOrganization.push({ userId, organizationId });
      return { activeOrganizationId: organizationId };
    },
  };
  return { service: new ProfileService(repository as unknown as ProfileRepository), calls };
}

test('PATCH /api/me: actualiza nombre (recortado) y telefono del usuario del token', async () => {
  const { service, calls } = makeService();
  const user = await service.updateMe('user-1', { name: '  Ana Martínez  ', phone: ' 555-1234 ' });
  assert.deepEqual(calls.updateUser, [{ userId: 'user-1', data: { name: 'Ana Martínez', phone: '555-1234' } }]);
  assert.equal(user.name, 'Ana Martínez');
});

test('PATCH /api/me: telefono vacio o null lo borra; campos ausentes no se tocan', async () => {
  const { service, calls } = makeService();
  await service.updateMe('user-1', { phone: '' });
  await service.updateMe('user-1', { phone: null });
  await service.updateMe('user-1', {});
  assert.deepEqual(calls.updateUser, [
    { userId: 'user-1', data: { phone: null } },
    { userId: 'user-1', data: { phone: null } },
    { userId: 'user-1', data: {} },
  ]);
});

test('PATCH /api/me: rechaza nombre vacio y nunca cambia el correo', async () => {
  const { service, calls } = makeService();
  await assert.rejects(service.updateMe('user-1', { name: '   ' }), BadRequestException);
  await assert.rejects(service.updateMe('user-1', { name: 42 }), BadRequestException);
  // El correo no es parte del esquema: se descarta y nunca llega al repositorio.
  await service.updateMe('user-1', { name: 'Ana', email: 'otra@x.com' });
  assert.deepEqual(calls.updateUser, [{ userId: 'user-1', data: { name: 'Ana' } }]);
});

test('PUT /api/me/instruments: reemplaza la lista y marca el primero como principal si nadie lo es', async () => {
  const { service, calls } = makeService();
  const result = await service.replaceInstruments('user-1', { instruments: [{ instrument: 'BASS' }, { instrument: 'LEAD_VOCAL' }] });
  assert.deepEqual(calls.replaceInstruments, [
    { userId: 'user-1', instruments: [{ instrument: 'BASS', isPrimary: true }, { instrument: 'LEAD_VOCAL', isPrimary: false }] },
  ]);
  assert.deepEqual(result.map((item) => item.instrument), ['BASS', 'LEAD_VOCAL']);
});

test('PUT /api/me/instruments: respeta el principal elegido y lo devuelve primero', async () => {
  const { service } = makeService();
  const result = await service.replaceInstruments('user-1', {
    instruments: [{ instrument: 'BASS' }, { instrument: 'KEYS', isPrimary: true }],
  });
  assert.deepEqual(result.map((item) => [item.instrument, item.isPrimary]), [['KEYS', true], ['BASS', false]]);
});

test('PUT /api/me/instruments: lista vacia deja a la persona sin instrumentos', async () => {
  const { service, calls } = makeService();
  const result = await service.replaceInstruments('user-1', { instruments: [] });
  assert.deepEqual(calls.replaceInstruments, [{ userId: 'user-1', instruments: [] }]);
  assert.deepEqual(result, []);
});

test('PUT /api/me/instruments: rechaza repetidos, dos principales e instrumentos que no existen', async () => {
  const { service, calls } = makeService();
  await assert.rejects(service.replaceInstruments('user-1', { instruments: [{ instrument: 'BASS' }, { instrument: 'BASS' }] }), /repetidos/);
  await assert.rejects(
    service.replaceInstruments('user-1', { instruments: [{ instrument: 'BASS', isPrimary: true }, { instrument: 'KEYS', isPrimary: true }] }),
    /un instrumento principal/,
  );
  await assert.rejects(service.replaceInstruments('user-1', { instruments: [{ instrument: 'KAZOO' }] }), BadRequestException);
  await assert.rejects(service.replaceInstruments('user-1', {}), BadRequestException);
  assert.equal(calls.replaceInstruments.length, 0);
});

test('normalizeInstruments y sortInstruments: un solo principal y principal primero', () => {
  assert.deepEqual(normalizeInstruments([]), []);
  assert.deepEqual(normalizeInstruments([{ instrument: 'DRUMS', isPrimary: false }]), [{ instrument: 'DRUMS', isPrimary: true }]);
  const sorted = sortInstruments([
    { instrument: 'BASS', isPrimary: false, createdAt: new Date(2026, 0, 1) },
    { instrument: 'KEYS', isPrimary: false, createdAt: new Date(2026, 0, 3) },
    { instrument: 'DRUMS', isPrimary: true, createdAt: new Date(2026, 0, 2) },
  ]);
  assert.deepEqual(sorted.map((item) => item.instrument), ['DRUMS', 'BASS', 'KEYS']);
});

test('PUT /api/me/active-organization: guarda solo una organizacion donde es miembro activo; otra da 404', async () => {
  const { service, calls } = makeService();
  assert.deepEqual(await service.setActiveOrganization('user-1', { organizationId: ' org-1 ' }), { activeOrganizationId: 'org-1' });
  await assert.rejects(service.setActiveOrganization('user-1', { organizationId: 'org-ajena' }), /Organizacion no encontrada/);
  await assert.rejects(service.setActiveOrganization('user-1', {}), BadRequestException);
  assert.deepEqual(calls.setActiveOrganization, [{ userId: 'user-1', organizationId: 'org-1' }]);
});
