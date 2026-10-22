import { Inject, Injectable } from '@nestjs/common';
import type { RolePermissionsMatrix, UpdateRolePermissionsData } from '@harmonyhub/contracts';
import type { OrgMember } from '../current-membership.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { ALWAYS_GRANTED_PERMISSIONS, CONFIGURABLE_PERMISSIONS, CONFIGURABLE_ROLES, effectivePermissions, OWNER_ONLY_PERMISSIONS, overridesFor, PERMISSIONS_BY_ROLE } from '../permission-table';

type ConfigurableRole = Exclude<OrgMember['role'], 'OWNER'>;

/** Roles y permisos de la organizacion activa: el propietario los ve, los cambia y los restablece. */
@Injectable()
export class RolePermissionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async matrix(member: OrgMember): Promise<RolePermissionsMatrix> {
    const overrides = await this.prisma.rolePermissionOverride.findMany({ where: { organizationId: member.organizationId }, select: { role: true, permission: true, granted: true } });
    const roles = CONFIGURABLE_ROLES as ConfigurableRole[];
    const pick = (permissions: Iterable<string>) => [...permissions].filter((permission) => (CONFIGURABLE_PERMISSIONS as readonly string[]).includes(permission));
    return {
      configurable: [...CONFIGURABLE_PERMISSIONS],
      ownerOnly: [...OWNER_ONLY_PERMISSIONS],
      alwaysGranted: [...ALWAYS_GRANTED_PERMISSIONS],
      roles,
      defaults: Object.fromEntries(roles.map((role) => [role, pick(PERMISSIONS_BY_ROLE[role])])) as RolePermissionsMatrix['defaults'],
      effective: Object.fromEntries(roles.map((role) => [role, pick(effectivePermissions(role, overrides))])) as RolePermissionsMatrix['effective'],
      customized: overrides.length > 0,
    };
  }

  /** Guarda solo las diferencias con la tabla por defecto (lo critico o desconocido se ignora). */
  async update(member: OrgMember, data: UpdateRolePermissionsData) {
    const { organizationId } = member;
    const roles = Object.keys(data.roles) as ConfigurableRole[];
    const rows = roles.flatMap((role) => overridesFor(role, data.roles[role] ?? []));
    await this.prisma.$transaction([
      this.prisma.rolePermissionOverride.deleteMany({ where: { organizationId, role: { in: roles } } }),
      this.prisma.rolePermissionOverride.createMany({ data: rows.map((row) => ({ ...row, organizationId, updatedById: member.userId })) }),
    ]);
    return this.matrix(member);
  }

  async reset(member: OrgMember) {
    await this.prisma.rolePermissionOverride.deleteMany({ where: { organizationId: member.organizationId } });
    return this.matrix(member);
  }
}
