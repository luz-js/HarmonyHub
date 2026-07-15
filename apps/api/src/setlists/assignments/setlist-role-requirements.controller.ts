import { Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../auth/current-user.decorator';
import { SetlistRoleRequirementsService } from './setlist-role-requirements.service';

@Controller('api/setlists')
@UseGuards(AuthGuard)
export class SetlistRoleRequirementsController {
  constructor(@Inject(SetlistRoleRequirementsService) private readonly requirementsService: SetlistRoleRequirementsService) {}

  @Get(':setlistId/items/:itemId/requirements')
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.requirementsService.list(user.id, organizationId, setlistId, itemId);
  }

  @Post(':setlistId/items/:itemId/requirements')
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.requirementsService.create(user.id, organizationId, setlistId, itemId, body ?? {});
  }

  @Patch(':setlistId/items/:itemId/requirements/:requirementId')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
    @Param('requirementId') requirementId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.requirementsService.update(user.id, organizationId, setlistId, itemId, requirementId, body ?? {});
  }

  @Delete(':setlistId/items/:itemId/requirements/:requirementId')
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
    @Param('requirementId') requirementId: string,
  ) {
    return this.requirementsService.remove(user.id, organizationId, setlistId, itemId, requirementId);
  }
}
