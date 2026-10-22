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
  'availability.read',
  'stage.lead',
  'organization.leave',
  'organization.transfer',
  'organization.archive',
  'roles.manage',
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
  'availability.read',
  'stage.lead',
];

const ORGANIZATION_ADMIN: Permission[] = [...LEADERSHIP, 'organization.manage', 'members.manage', 'invitations.manage', 'events.delete', 'setlists.delete'];

/** Lo que solo un propietario decide sobre la organizacion entera: pasar la propiedad y archivarla o restaurarla. */
const OWNERSHIP: Permission[] = [...ORGANIZATION_ADMIN, 'organization.transfer', 'organization.archive', 'roles.manage'];

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

// ======================= Permisos configurables por organizacion =======================

/** Roles que el propietario puede ajustar (el propietario siempre tiene todo). */
export const CONFIGURABLE_ROLES: readonly MembershipRole[] = ['ADMIN', 'LEADER', 'MUSICIAN', 'GUEST'];

/**
 * Fijos para todos: solo el propietario transfiere, archiva y cambia roles; todo miembro lee y puede salir.
 * Estos no se pueden cambiar con los ajustes de la organizacion.
 */
export const OWNER_ONLY_PERMISSIONS: readonly Permission[] = ['organization.transfer', 'organization.archive', 'roles.manage'];
export const ALWAYS_GRANTED_PERMISSIONS: readonly Permission[] = ['read', 'organization.leave'];
export const CONFIGURABLE_PERMISSIONS: readonly Permission[] = PERMISSIONS.filter(
  (permission) => !OWNER_ONLY_PERMISSIONS.includes(permission) && !ALWAYS_GRANTED_PERMISSIONS.includes(permission),
);

export type PermissionOverride = { role: MembershipRole; permission: string; granted: boolean };

export function isConfigurable(role: MembershipRole, permission: string): permission is Permission {
  return CONFIGURABLE_ROLES.includes(role) && (CONFIGURABLE_PERMISSIONS as readonly string[]).includes(permission);
}

/** Permisos de un rol en una organizacion: la tabla por defecto con los cambios del propietario (los no permitidos se ignoran). */
export function effectivePermissions(role: MembershipRole, overrides: readonly PermissionOverride[]): Set<Permission> {
  const result = new Set<Permission>(PERMISSIONS_BY_ROLE[role] ?? []);
  if (role === 'OWNER') return result;
  for (const override of overrides) {
    if (override.role !== role || !isConfigurable(role, override.permission)) continue;
    if (override.granted) result.add(override.permission);
    else result.delete(override.permission);
  }
  return result;
}

export function effectiveRoleCan(role: MembershipRole, permission: Permission, overrides: readonly PermissionOverride[]) {
  return effectivePermissions(role, overrides).has(permission);
}

/** Lo que hay que guardar para que un rol quede con `wanted`: solo las diferencias con la tabla por defecto. */
export function overridesFor(role: MembershipRole, wanted: readonly string[]): PermissionOverride[] {
  if (!CONFIGURABLE_ROLES.includes(role)) return [];
  const defaults = PERMISSIONS_BY_ROLE[role];
  return CONFIGURABLE_PERMISSIONS.flatMap((permission) => {
    const granted = wanted.includes(permission);
    return granted === defaults.includes(permission) ? [] : [{ role, permission, granted }];
  });
}
