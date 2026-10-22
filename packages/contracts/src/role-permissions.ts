import { z } from 'zod';
import type { MembershipRole } from './enums';

/** PUT /api/role-permissions: los permisos que debe tener cada rol configurable (los demas quedan sin dar). */
export const updateRolePermissionsSchema = z.object({
  roles: z.partialRecord(z.enum(['ADMIN', 'LEADER', 'MUSICIAN', 'GUEST']), z.array(z.string().min(1).max(80)).max(100)),
});
export type UpdateRolePermissionsInput = z.input<typeof updateRolePermissionsSchema>;
export type UpdateRolePermissionsData = z.output<typeof updateRolePermissionsSchema>;

/** GET /api/role-permissions (solo el propietario) */
export type RolePermissionsMatrix = {
  /** Permisos que se pueden activar o desactivar, en orden. */
  configurable: string[];
  /** Fijos: solo el propietario (transferir, archivar, cambiar roles) o de todos (leer, salir). */
  ownerOnly: string[];
  alwaysGranted: string[];
  roles: Array<Exclude<MembershipRole, 'OWNER'>>;
  defaults: Record<Exclude<MembershipRole, 'OWNER'>, string[]>;
  effective: Record<Exclude<MembershipRole, 'OWNER'>, string[]>;
  customized: boolean;
};
