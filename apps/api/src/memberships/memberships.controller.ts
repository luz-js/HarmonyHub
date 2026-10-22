import { Body, Controller, Get, Inject, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { CurrentMembership, OrgMember } from '../permissions/current-membership.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { MembershipsService } from './memberships.service';

@Controller('api/memberships')
@UseGuards(AuthGuard, PermissionsGuard)
export class MembershipsController {
  constructor(@Inject(MembershipsService) private readonly membershipsService: MembershipsService) {}

  @Get()
  @RequirePermission('read', { organizationFrom: 'headerOrQuery' })
  list(@CurrentMembership() member: OrgMember) {
    return this.membershipsService.list(member);
  }

  /** Excepcion: la organizacion sale de la membresia a editar; el servicio verifica 'members.manage' y las reglas de propietario. */
  @Patch(':id')
  update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.membershipsService.update(user.id, id, body ?? {});
  }
}
