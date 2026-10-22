import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { SetlistRoleRequirementsService } from './setlist-role-requirements.service';
import { CurrentMembership, OrgMember } from '../../permissions/current-membership.decorator';
import { PermissionsGuard } from '../../permissions/permissions.guard';
import { RequirePermission } from '../../permissions/require-permission.decorator';

@Controller('api/setlists')
@UseGuards(AuthGuard, PermissionsGuard)
export class SetlistRoleRequirementsController {
  constructor(@Inject(SetlistRoleRequirementsService) private readonly requirementsService: SetlistRoleRequirementsService) {}

  @Get(':setlistId/items/:itemId/requirements')
  @RequirePermission('read')
  list(
    @CurrentMembership() member: OrgMember,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.requirementsService.list(member, setlistId, itemId);
  }

  @Post(':setlistId/items/:itemId/requirements')
  @RequirePermission('setlists.requirements.manage')
  create(
    @CurrentMembership() member: OrgMember,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.requirementsService.create(member, setlistId, itemId, body ?? {});
  }

  @Patch(':setlistId/items/:itemId/requirements/:requirementId')
  @RequirePermission('setlists.requirements.manage')
  update(
    @CurrentMembership() member: OrgMember,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
    @Param('requirementId') requirementId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.requirementsService.update(member, setlistId, itemId, requirementId, body ?? {});
  }

  @Delete(':setlistId/items/:itemId/requirements/:requirementId')
  @RequirePermission('setlists.requirements.manage')
  remove(
    @CurrentMembership() member: OrgMember,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
    @Param('requirementId') requirementId: string,
  ) {
    return this.requirementsService.remove(member, setlistId, itemId, requirementId);
  }
}
