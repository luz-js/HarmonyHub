import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { EventsService } from './events.service';
import { CurrentMembership, OrgMember } from '../permissions/current-membership.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';

@Controller('api/events')
@UseGuards(AuthGuard, PermissionsGuard)
export class EventsController {
  constructor(@Inject(EventsService) private readonly eventsService: EventsService) {}

  @Get()
  @RequirePermission('read')
  list(@CurrentMembership() member: OrgMember, @Query() query: Record<string, unknown>) {
    return this.eventsService.list(member, query);
  }

  @Get(':id')
  @RequirePermission('read')
  detail(@CurrentMembership() member: OrgMember, @Param('id') id: string) {
    return this.eventsService.detail(member, id);
  }

  @Post()
  @RequirePermission('events.manage')
  create(@CurrentMembership() member: OrgMember, @Body() body: Record<string, unknown>) {
    return this.eventsService.create(member, body ?? {});
  }

  @Patch(':id')
  @RequirePermission('events.manage')
  update(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.eventsService.update(member, id, body ?? {});
  }

  @Delete(':id')
  @RequirePermission('events.delete')
  remove(@CurrentMembership() member: OrgMember, @Param('id') id: string) {
    return this.eventsService.delete(member, id);
  }

  @Post(':id/musicians')
  @RequirePermission('events.manage')
  addMusician(
    @CurrentMembership() member: OrgMember,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.eventsService.addMusician(member, id, body ?? {});
  }

  @Patch(':id/musicians/:musicianId')
  @RequirePermission('read')
  updateMusician(
    @CurrentMembership() member: OrgMember,
    @Param('id') id: string,
    @Param('musicianId') musicianId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.eventsService.updateMusician(member, id, musicianId, body ?? {});
  }

  @Delete(':id/musicians/:musicianId')
  @RequirePermission('events.manage')
  removeMusician(
    @CurrentMembership() member: OrgMember,
    @Param('id') id: string,
    @Param('musicianId') musicianId: string,
  ) {
    return this.eventsService.removeMusician(member, id, musicianId);
  }
}
