import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  copySetlistAssignmentsSchema,
  createSetlistAssignmentSchema,
  updateSetlistAssignmentSchema,
  type CopySetlistAssignmentsData,
  type CreateSetlistAssignmentData,
  type UpdateSetlistAssignmentData,
} from '@harmonyhub/contracts';
import { ZodPipe } from '../../shared/zod.pipe';
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
    @Body(new ZodPipe(createSetlistAssignmentSchema)) body: CreateSetlistAssignmentData,
  ) {
    return this.assignmentsService.create(member, setlistId, itemId, body);
  }

  // POST .../assignments/copy debe registrarse antes que rutas con :assignmentId dinamico
  // para que Express no intente resolver "copy" como un id.
  @Post(':setlistId/items/:itemId/assignments/copy')
  @RequirePermission('setlists.assignments.manage')
  copy(
    @CurrentMembership() member: OrgMember,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
    @Body(new ZodPipe(copySetlistAssignmentsSchema)) body: CopySetlistAssignmentsData,
  ) {
    return this.assignmentsService.copy(member, setlistId, itemId, body);
  }

  @Patch(':setlistId/items/:itemId/assignments/:assignmentId')
  @RequirePermission('setlists.assignments.manage')
  update(
    @CurrentMembership() member: OrgMember,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
    @Param('assignmentId') assignmentId: string,
    @Body(new ZodPipe(updateSetlistAssignmentSchema)) body: UpdateSetlistAssignmentData,
  ) {
    return this.assignmentsService.update(member, setlistId, itemId, assignmentId, body);
  }

  @Patch(':setlistId/items/:itemId/assignments/:assignmentId/preparation')
  @RequirePermission('read')
  updatePreparation(
    @CurrentMembership() member: OrgMember,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
    @Param('assignmentId') assignmentId: string,
    // Sin ZodPipe: el servicio valida despues de comprobar que la asignacion es de quien la cambia (403 primero).
    @Body() body: unknown,
  ) {
    return this.assignmentsService.updatePreparation(member, setlistId, itemId, assignmentId, body);
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
