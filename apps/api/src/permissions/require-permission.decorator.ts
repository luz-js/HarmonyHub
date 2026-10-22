import { SetMetadata } from '@nestjs/common';
import type { Permission } from './permission-table';

export const PERMISSION_KEY = 'harmonyhub:permission';

/**
 * De donde sale la organizacion a verificar:
 * - 'header' (por defecto): `x-organization-id`, la organizacion activa del cliente.
 * - 'headerOrQuery': el header y, si falta, `?organizationId=` (listas de miembros e invitaciones).
 * - { param } / { body }: la ruta trabaja sobre una organizacion indicada en la URL o en el cuerpo.
 */
export type OrganizationSource = 'header' | 'headerOrQuery' | { param: string } | { body: string };

export type PermissionRequirement = { permission: Permission; organizationFrom: OrganizationSource };

/** Etiqueta una ruta (o un controller entero) con el permiso que exige; lo verifica PermissionsGuard. */
export const RequirePermission = (permission: Permission, options: { organizationFrom?: OrganizationSource } = {}) =>
  SetMetadata(PERMISSION_KEY, { permission, organizationFrom: options.organizationFrom ?? 'header' } satisfies PermissionRequirement);
