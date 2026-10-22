import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { SetlistAssignmentsService } from './setlist-assignments.service';
import { CurrentMembership, OrgMember } from '../../permissions/current-membership.decorator';
import { PermissionsGuard } from '../../permissions/permissions.guard';
import { RequirePermission } from '../../permissions/require-permission.decorator';

@Controller('api/setlists')
@UseGuards(AuthGuard, PermissionsGuard)
export class SetlistAssignmentsController {
  constructor(@Inject(SetlistAssignmentsService) private readonly assignmentsService: SetlistAssignmentsService) {}

  @Get(':setlistId/team')
  @RequirePermission('read')
  team(@CurrentMembership() member: OrgMember, @Param('setlistId') setlistId: string) {
    return this.assignmentsService.team(member, setlistId);
  }

  @Get(':setlistId/items/:itemId/assignments')
  @RequirePermission('read')
  list(
    @CurrentMembership() member: OrgMember,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.assignmentsService.list(member, setlistId, itemId);
  }

  @Post(':setlistId/items/:itemId/assignments')
  @RequirePermission('setlists.assignments.manage')
  create(
    @CurrentMembership() member: OrgMember,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.assignmentsService.create(member, setlistId, itemId, body ?? {});
  }

  // POST .../assignments/copy debe registrarse antes que rutas con :assignmentId dinamico
  // para que Express no intente resolver "copy" como un id.
  @Post(':setlistId/items/:itemId/assignments/copy')
  @RequirePermission('setlists.assignments.manage')
  copy(
    @CurrentMembership() member: OrgMember,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.assignmentsService.copy(member, setlistId, itemId, body ?? {});
  }

  @Patch(':setlistId/items/:itemId/assignments/:assignmentId')
  @RequirePermission('setlists.assignments.manage')
  update(
    @CurrentMembership() member: OrgMember,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.assignmentsService.update(member, setlistId, itemId, assignmentId, body ?? {});
  }

  @Patch(':setlistId/items/:itemId/assignments/:assignmentId/preparation')
  @RequirePermission('read')
  updatePreparation(
    @CurrentMembership() member: OrgMember,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.assignmentsService.updatePreparation(member, setlistId, itemId, assignmentId, body ?? {});
  }

  @Delete(':setlistId/items/:itemId/assignments/:assignmentId')
  @RequirePermission('setlists.assignments.manage')
  remove(
    @CurrentMembership() member: OrgMember,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.assignmentsService.remove(member, setlistId, itemId, assignmentId);
  }
}
