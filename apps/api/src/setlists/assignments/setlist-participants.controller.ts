import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { SetlistParticipantsService } from './setlist-participants.service';
import { CurrentMembership, OrgMember } from '../../permissions/current-membership.decorator';
import { PermissionsGuard } from '../../permissions/permissions.guard';
import { RequirePermission } from '../../permissions/require-permission.decorator';

@Controller('api/setlists')
@UseGuards(AuthGuard, PermissionsGuard)
export class SetlistParticipantsController {
  constructor(@Inject(SetlistParticipantsService) private readonly participantsService: SetlistParticipantsService) {}

  @Get(':setlistId/participants')
  @RequirePermission('read')
  list(@CurrentMembership() member: OrgMember, @Param('setlistId') setlistId: string) {
    return this.participantsService.list(member, setlistId);
  }

  @Post(':setlistId/participants')
  @RequirePermission('setlists.participants.manage')
  add(@CurrentMembership() member: OrgMember, @Param('setlistId') setlistId: string, @Body() body: Record<string, unknown>) {
    return this.participantsService.add(member, setlistId, body ?? {});
  }

  @Patch(':setlistId/participants/:participantId')
  @RequirePermission('setlists.participants.manage')
  update(
    @CurrentMembership() member: OrgMember,
    @Param('setlistId') setlistId: string,
    @Param('participantId') participantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.participantsService.update(member, setlistId, participantId, body ?? {});
  }

  @Delete(':setlistId/participants/:participantId')
  @RequirePermission('setlists.participants.manage')
  remove(
    @CurrentMembership() member: OrgMember,
    @Param('setlistId') setlistId: string,
    @Param('participantId') participantId: string,
    @Query('removeAssignments') removeAssignments: string | undefined,
  ) {
    return this.participantsService.remove(member, setlistId, participantId, removeAssignments === 'true');
  }
}
