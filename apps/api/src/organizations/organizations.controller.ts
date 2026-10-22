import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { OrganizationsService } from './organizations.service';

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
  @RequirePermission('read', { organizationFrom: { param: 'id' } })
  detail(@Param('id') id: string) {
    return this.organizationsService.detail(id);
  }

  @Patch(':id')
  @RequirePermission('organization.manage', { organizationFrom: { param: 'id' } })
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.organizationsService.update(id, body ?? {});
  }
}
