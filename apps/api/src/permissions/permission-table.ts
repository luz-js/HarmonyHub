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
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const LEADERSHIP: Permission[] = [
  'read',
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

export const PERMISSIONS_BY_ROLE: Record<MembershipRole, readonly Permission[]> = {
  OWNER: ORGANIZATION_ADMIN,
  ADMIN: ORGANIZATION_ADMIN,
  LEADER: LEADERSHIP,
  MUSICIAN: ['read'],
  GUEST: ['read'],
};

/** Mensaje unico para un 403 por rol (el de "no eres miembro" se mantiene aparte). */
export const PERMISSION_DENIED_MESSAGE = 'No tienes permiso para hacer esto';

export function roleCan(role: MembershipRole, permission: Permission) {
  return PERMISSIONS_BY_ROLE[role]?.includes(permission) ?? false;
}
