import { Body, Controller, Get, Headers, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { InvitationsService } from './invitations.service';

@Controller('api/invitations')
@UseGuards(AuthGuard)
export class InvitationsController {
  constructor(@Inject(InvitationsService) private readonly invitationsService: InvitationsService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') headerOrganizationId: string | undefined, @Query('organizationId') queryOrganizationId: string | undefined) {
    return this.invitationsService.list(user.id, headerOrganizationId || queryOrganizationId || '');
  }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() body: Record<string, unknown>) {
    return this.invitationsService.create(user.id, body ?? {});
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.invitationsService.cancel(user.id, id);
  }

  @Post(':token/accept')
  accept(@CurrentUser() user: CurrentUserPayload, @Param('token') token: string) {
    return this.invitationsService.accept(token, user.id);
  }
}
