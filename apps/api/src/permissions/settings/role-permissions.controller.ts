import { Body, Controller, Delete, Get, Inject, Put, UseGuards } from '@nestjs/common';
import { updateRolePermissionsSchema, type UpdateRolePermissionsData } from '@harmonyhub/contracts';
import { AuthGuard } from '../../auth/auth.guard';
import { ZodPipe } from '../../shared/zod.pipe';
import { CurrentMembership, OrgMember } from '../current-membership.decorator';
import { PermissionsGuard } from '../permissions.guard';
import { RequirePermission } from '../require-permission.decorator';
import { RolePermissionsService } from './role-permissions.service';

/** Ajustes → Roles y permisos: solo el propietario. */
@Controller('api/role-permissions')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermission('roles.manage')
export class RolePermissionsController {
  constructor(@Inject(RolePermissionsService) private readonly rolePermissions: RolePermissionsService) {}

  @Get()
  matrix(@CurrentMembership() member: OrgMember) {
    return this.rolePermissions.matrix(member);
  }

  @Put()
  update(@CurrentMembership() member: OrgMember, @Body(new ZodPipe(updateRolePermissionsSchema)) body: UpdateRolePermissionsData) {
    return this.rolePermissions.update(member, body);
  }

  /** Restablecer valores por defecto. */
  @Delete()
  reset(@CurrentMembership() member: OrgMember) {
    return this.rolePermissions.reset(member);
  }
}
