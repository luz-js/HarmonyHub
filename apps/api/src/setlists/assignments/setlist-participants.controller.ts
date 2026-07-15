import { Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../auth/current-user.decorator';
import { SetlistParticipantsService } from './setlist-participants.service';

@Controller('api/setlists')
@UseGuards(AuthGuard)
export class SetlistParticipantsController {
  constructor(@Inject(SetlistParticipantsService) private readonly participantsService: SetlistParticipantsService) {}

  @Get(':setlistId/participants')
  list(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('setlistId') setlistId: string) {
    return this.participantsService.list(user.id, organizationId, setlistId);
  }

  @Post(':setlistId/participants')
  add(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('setlistId') setlistId: string, @Body() body: Record<string, unknown>) {
    return this.participantsService.add(user.id, organizationId, setlistId, body ?? {});
  }

  @Patch(':setlistId/participants/:participantId')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('setlistId') setlistId: string,
    @Param('participantId') participantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.participantsService.update(user.id, organizationId, setlistId, participantId, body ?? {});
  }

  @Delete(':setlistId/participants/:participantId')
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('setlistId') setlistId: string,
    @Param('participantId') participantId: string,
    @Query('removeAssignments') removeAssignments: string | undefined,
  ) {
    return this.participantsService.remove(user.id, organizationId, setlistId, participantId, removeAssignments === 'true');
  }
}
