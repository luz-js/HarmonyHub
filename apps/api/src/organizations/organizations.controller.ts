import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { CurrentMembership, OrgMember } from '../permissions/current-membership.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { OrganizationsService } from './organizations.service';

const fromParam = { organizationFrom: { param: 'id' } } as const;

@Controller('api/organizations')
@UseGuards(AuthGuard, PermissionsGuard)
export class OrganizationsController {
  constructor(@Inject(OrganizationsService) private readonly organizationsService: OrganizationsService) {}

  /** Sin etiqueta: lista las organizaciones del usuario y crear una nueva no requiere organizacion activa. */
  @Get()
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.organizationsService.listForUser(user.id);
  }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() body: Record<string, unknown>) {
    return this.organizationsService.create(user.id, body ?? {});
  }

  @Get(':id')
  @RequirePermission('read', fromParam)
  detail(@Param('id') id: string) {
    return this.organizationsService.detail(id);
  }

  @Patch(':id')
  @RequirePermission('organization.manage', fromParam)
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.organizationsService.update(id, body ?? {});
  }

  @Post(':id/leave')
  @HttpCode(200)
  @RequirePermission('organization.leave', fromParam)
  leave(@CurrentMembership() member: OrgMember) {
    return this.organizationsService.leave(member);
  }

  @Post(':id/transfer')
  @HttpCode(200)
  @RequirePermission('organization.transfer', fromParam)
  transfer(@CurrentMembership() member: OrgMember, @Body() body: Record<string, unknown>) {
    return this.organizationsService.transfer(member, body ?? {});
  }

  @Post(':id/archive')
  @HttpCode(200)
  @RequirePermission('organization.archive', fromParam)
  archive(@CurrentMembership() member: OrgMember, @Body() body: Record<string, unknown>) {
    return this.organizationsService.archive(member, body ?? {});
  }

  @Post(':id/restore')
  @HttpCode(200)
  @RequirePermission('organization.archive', fromParam)
  restore(@CurrentMembership() member: OrgMember) {
    return this.organizationsService.restore(member);
  }
}
