import { Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../auth/current-user.decorator';
import { SetlistAssignmentsService } from './setlist-assignments.service';

@Controller('api/setlists')
@UseGuards(AuthGuard)
export class SetlistAssignmentsController {
  constructor(@Inject(SetlistAssignmentsService) private readonly assignmentsService: SetlistAssignmentsService) {}

  @Get(':setlistId/team')
  team(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('setlistId') setlistId: string) {
    return this.assignmentsService.team(user.id, organizationId, setlistId);
  }

  @Get(':setlistId/items/:itemId/assignments')
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.assignmentsService.list(user.id, organizationId, setlistId, itemId);
  }

  @Post(':setlistId/items/:itemId/assignments')
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.assignmentsService.create(user.id, organizationId, setlistId, itemId, body ?? {});
  }

  // POST .../assignments/copy debe registrarse antes que rutas con :assignmentId dinamico
  // para que Express no intente resolver "copy" como un id.
  @Post(':setlistId/items/:itemId/assignments/copy')
  copy(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.assignmentsService.copy(user.id, organizationId, setlistId, itemId, body ?? {});
  }

  @Patch(':setlistId/items/:itemId/assignments/:assignmentId')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.assignmentsService.update(user.id, organizationId, setlistId, itemId, assignmentId, body ?? {});
  }

  @Patch(':setlistId/items/:itemId/assignments/:assignmentId/preparation')
  updatePreparation(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.assignmentsService.updatePreparation(user.id, organizationId, setlistId, itemId, assignmentId, body ?? {});
  }

  @Delete(':setlistId/items/:itemId/assignments/:assignmentId')
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.assignmentsService.remove(user.id, organizationId, setlistId, itemId, assignmentId);
  }
}
