import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  addEventMusicianSchema,
  createEventSchema,
  eventListQuerySchema,
  updateEventMusicianSchema,
  updateEventSchema,
  type AddEventMusicianData,
  type CreateEventData,
  type EventListQueryData,
  type UpdateEventData,
  type UpdateEventMusicianData,
} from '@harmonyhub/contracts';
import { AuthGuard } from '../auth/auth.guard';
import { EventsService } from './events.service';
import { CurrentMembership, OrgMember } from '../permissions/current-membership.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { ZodPipe } from '../shared/zod.pipe';

@Controller('api/events')
@UseGuards(AuthGuard, PermissionsGuard)
export class EventsController {
  constructor(@Inject(EventsService) private readonly eventsService: EventsService) {}

  @Get()
  @RequirePermission('read')
  list(@CurrentMembership() member: OrgMember, @Query(new ZodPipe(eventListQuerySchema, 'Filtros invalidos')) query: EventListQueryData) {
    return this.eventsService.list(member, query);
  }

  @Get(':id')
  @RequirePermission('read')
  detail(@CurrentMembership() member: OrgMember, @Param('id') id: string) {
    return this.eventsService.detail(member, id);
  }

  @Post()
  @RequirePermission('events.manage')
  create(@CurrentMembership() member: OrgMember, @Body(new ZodPipe(createEventSchema)) body: CreateEventData) {
    return this.eventsService.create(member, body);
  }

  @Patch(':id')
  @RequirePermission('events.manage')
  update(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body(new ZodPipe(updateEventSchema)) body: UpdateEventData) {
    return this.eventsService.update(member, id, body);
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
    @Body(new ZodPipe(addEventMusicianSchema)) body: AddEventMusicianData,
  ) {
    return this.eventsService.addMusician(member, id, body);
  }

  @Patch(':id/musicians/:musicianId')
  @RequirePermission('read')
  updateMusician(
    @CurrentMembership() member: OrgMember,
    @Param('id') id: string,
    @Param('musicianId') musicianId: string,
    @Body(new ZodPipe(updateEventMusicianSchema)) body: UpdateEventMusicianData,
  ) {
    return this.eventsService.updateMusician(member, id, musicianId, body);
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
