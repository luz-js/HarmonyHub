import type { MembershipRole } from '@prisma/client';

/**
 * Tabla unica de permisos por rol. Cada ruta de organizacion declara el suyo con @RequirePermission
 * y el PermissionsGuard lo verifica antes de entrar. Las reglas que dependen del dato (autor de una
 * nota, asignacion propia, "un ADMIN no toca a un OWNER"...) siguen en los servicios.
 */
export const PERMISSIONS = [
  'read',
  'organization.manage',
  'members.manage',
  'invitations.manage',
  'songs.manage',
  'events.manage',
  'events.delete',
  'setlists.manage',
  'setlists.publish',
  'setlists.archive',
  'setlists.delete',
  'setlists.participants.manage',
  'setlists.assignments.manage',
  'setlists.requirements.manage',
  'setlists.cues.manage',
  'organization.leave',
  'organization.transfer',
  'organization.archive',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const LEADERSHIP: Permission[] = [
  'read',
  'organization.leave',
  'songs.manage',
  'events.manage',
  'setlists.manage',
  'setlists.publish',
  'setlists.archive',
  'setlists.participants.manage',
  'setlists.assignments.manage',
  'setlists.requirements.manage',
  'setlists.cues.manage',
];

const ORGANIZATION_ADMIN: Permission[] = [...LEADERSHIP, 'organization.manage', 'members.manage', 'invitations.manage', 'events.delete', 'setlists.delete'];

/** Lo que solo un propietario decide sobre la organizacion entera: pasar la propiedad y archivarla o restaurarla. */
const OWNERSHIP: Permission[] = [...ORGANIZATION_ADMIN, 'organization.transfer', 'organization.archive'];

export const PERMISSIONS_BY_ROLE: Record<MembershipRole, readonly Permission[]> = {
  OWNER: OWNERSHIP,
  ADMIN: ORGANIZATION_ADMIN,
  LEADER: LEADERSHIP,
  MUSICIAN: ['read', 'organization.leave'],
  GUEST: ['read', 'organization.leave'],
};

/** En una organizacion archivada se puede leer (GET) y, como unicos cambios, salir de ella o restaurarla. */
export const WRITES_ALLOWED_WHEN_ARCHIVED: readonly Permission[] = ['organization.leave', 'organization.archive'];

export const ARCHIVED_ORGANIZATION_MESSAGE = 'Esta organizacion esta archivada: solo se puede consultar';

/** Mensaje unico para un 403 por rol (el de "no eres miembro" se mantiene aparte). */
export const PERMISSION_DENIED_MESSAGE = 'No tienes permiso para hacer esto';

export function roleCan(role: MembershipRole, permission: Permission) {
  return PERMISSIONS_BY_ROLE[role]?.includes(permission) ?? false;
}
