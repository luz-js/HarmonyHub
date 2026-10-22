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
