import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { MembershipRole } from '@prisma/client';
import { PERMISSIONS, PERMISSIONS_BY_ROLE, roleCan, type Permission } from './permission-table';

const ROLES: MembershipRole[] = ['OWNER', 'ADMIN', 'LEADER', 'MUSICIAN', 'GUEST'];

/**
 * Copia literal de las reglas que habia antes de la tarea 11 (tabla vieja + funciones canX con roles a mano).
 * Sirve de contrato: la tabla nueva tiene que dar exactamente lo mismo para cada rol.
 */
const legacyTable: Record<MembershipRole, string[]> = {
  OWNER: ['organization.manage', 'members.manage', 'invitations.manage', 'songs.manage', 'events.manage', 'setlists.manage', 'read'],
  ADMIN: ['organization.manage', 'members.manage', 'invitations.manage', 'songs.manage', 'events.manage', 'setlists.manage', 'read'],
  LEADER: ['songs.manage', 'events.manage', 'setlists.manage', 'read'],
  MUSICIAN: ['read'],
  GUEST: ['read'],
};
const legacyCan = (role: MembershipRole, permission: string) => legacyTable[role].includes(permission);
const isLeadership = (role: MembershipRole) => role === 'OWNER' || role === 'ADMIN' || role === 'LEADER';
const isOwnerOrAdmin = (role: MembershipRole) => role === 'OWNER' || role === 'ADMIN';

const legacyRules: Record<Permission, (role: MembershipRole) => boolean> = {
  read: (role) => legacyCan(role, 'read'),
  'organization.manage': (role) => legacyCan(role, 'organization.manage'),
  'members.manage': (role) => legacyCan(role, 'members.manage'),
  'invitations.manage': (role) => legacyCan(role, 'invitations.manage'),
  'songs.manage': (role) => legacyCan(role, 'songs.manage'),
  'events.manage': (role) => legacyCan(role, 'events.manage'),
  'events.delete': isOwnerOrAdmin, // canDeleteEvents
  'setlists.manage': (role) => legacyCan(role, 'setlists.manage'),
  'setlists.publish': isLeadership, // canPublishSetlists
  'setlists.archive': isLeadership, // canArchiveSetlists
  'setlists.delete': isOwnerOrAdmin, // canDeleteSetlists
  'setlists.participants.manage': isLeadership, // canManageSetlistParticipants
  'setlists.assignments.manage': isLeadership, // canManageSetlistAssignments
  'setlists.requirements.manage': isLeadership, // canManageSetlistRequirements
  'setlists.cues.manage': isLeadership, // canManageSetlistCues
  // Nuevos en la tarea 22 (no existian antes): salir lo puede cualquiera; transferir y archivar, solo un propietario.
  'organization.leave': () => true,
  'organization.transfer': (role) => role === 'OWNER',
  'organization.archive': (role) => role === 'OWNER',
  // Nuevo en la tarea 25: ver la disponibilidad del equipo es de quien lo arma.
  'availability.read': isLeadership,
  // Nuevo en la tarea 30: dirigir el modo escenario en vivo, las mismas personas que editan setlists.
  'stage.lead': isLeadership,
  'roles.manage': (role) => role === 'OWNER',
};

test('la tabla nueva da exactamente los mismos permisos que las reglas anteriores, rol por rol', () => {
  for (const role of ROLES) {
    for (const permission of PERMISSIONS) {
      assert.equal(roleCan(role, permission), legacyRules[permission](role), `${role} / ${permission}`);
    }
  }
});

test('cada permiso de la tabla esta declarado y ningun rol tiene permisos repetidos', () => {
  for (const role of ROLES) {
    const granted = PERMISSIONS_BY_ROLE[role];
    assert.equal(new Set(granted).size, granted.length, role);
    for (const permission of granted) assert.ok(PERMISSIONS.includes(permission), `${role}: ${permission}`);
  }
});

test('permisos por organizacion: los cambios del propietario se aplican sobre la tabla por defecto', async () => {
  const { effectiveRoleCan } = await import('./permission-table');
  const overrides = [
    { role: 'LEADER' as const, permission: 'events.manage', granted: false },
    { role: 'MUSICIAN' as const, permission: 'setlists.manage', granted: true },
  ];
  assert.equal(effectiveRoleCan('LEADER', 'events.manage', overrides), false);
  assert.equal(effectiveRoleCan('LEADER', 'songs.manage', overrides), true, 'lo demas queda igual');
  assert.equal(effectiveRoleCan('MUSICIAN', 'setlists.manage', overrides), true);
  assert.equal(effectiveRoleCan('GUEST', 'setlists.manage', overrides), false, 'cada cambio es de su rol');
  assert.equal(effectiveRoleCan('LEADER', 'events.manage', []), true, 'sin cambios, la tabla por defecto');
});

test('permisos por organizacion: el propietario siempre tiene todo y lo critico no se puede dar ni quitar', async () => {
  const { effectivePermissions, effectiveRoleCan, CONFIGURABLE_PERMISSIONS } = await import('./permission-table');
  const hostile = [
    { role: 'OWNER' as const, permission: 'members.manage', granted: false },
    { role: 'ADMIN' as const, permission: 'organization.transfer', granted: true },
    { role: 'ADMIN' as const, permission: 'roles.manage', granted: true },
    { role: 'MUSICIAN' as const, permission: 'organization.archive', granted: true },
    { role: 'GUEST' as const, permission: 'read', granted: false },
    { role: 'GUEST' as const, permission: 'organization.leave', granted: false },
    { role: 'LEADER' as const, permission: 'no.existe', granted: true },
  ];
  assert.deepEqual([...effectivePermissions('OWNER', hostile)].sort(), [...PERMISSIONS].sort());
  for (const permission of ['organization.transfer', 'organization.archive', 'roles.manage'] as const) {
    for (const role of ['ADMIN', 'LEADER', 'MUSICIAN', 'GUEST'] as const) assert.equal(effectiveRoleCan(role, permission, hostile), false, `${role} ${permission}`);
    assert.ok(!CONFIGURABLE_PERMISSIONS.includes(permission));
  }
  assert.equal(effectiveRoleCan('GUEST', 'read', hostile), true);
  assert.equal(effectiveRoleCan('GUEST', 'organization.leave', hostile), true);
  assert.equal([...effectivePermissions('LEADER', hostile)].includes('no.existe' as never), false);
});

test('overridesFor guarda solo las diferencias con la tabla por defecto', async () => {
  const { overridesFor } = await import('./permission-table');
  assert.deepEqual(overridesFor('LEADER', [...PERMISSIONS_BY_ROLE.LEADER]), []);
  assert.deepEqual(overridesFor('MUSICIAN', ['read', 'songs.manage']), [{ role: 'MUSICIAN', permission: 'songs.manage', granted: true }]);
  assert.deepEqual(overridesFor('LEADER', PERMISSIONS_BY_ROLE.LEADER.filter((permission) => permission !== 'stage.lead')), [{ role: 'LEADER', permission: 'stage.lead', granted: false }]);
  assert.deepEqual(overridesFor('OWNER', []), []);
  assert.deepEqual(overridesFor('ADMIN', [...PERMISSIONS_BY_ROLE.ADMIN, 'roles.manage']), [], 'lo critico se ignora');
});
