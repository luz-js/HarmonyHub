import { Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { EventsService } from './events.service';

@Controller('api/events')
@UseGuards(AuthGuard)
export class EventsController {
  constructor(@Inject(EventsService) private readonly eventsService: EventsService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Query() query: Record<string, unknown>) {
    return this.eventsService.list(user.id, organizationId, query);
  }

  @Get(':id')
  detail(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string) {
    return this.eventsService.detail(user.id, organizationId, id);
  }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Body() body: Record<string, unknown>) {
    return this.eventsService.create(user.id, organizationId, body ?? {});
  }

  @Patch(':id')
  update(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.eventsService.update(user.id, organizationId, id, body ?? {});
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string) {
    return this.eventsService.delete(user.id, organizationId, id);
  }

  @Post(':id/musicians')
  addMusician(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.eventsService.addMusician(user.id, organizationId, id, body ?? {});
  }

  @Patch(':id/musicians/:musicianId')
  updateMusician(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
    @Param('musicianId') musicianId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.eventsService.updateMusician(user.id, organizationId, id, musicianId, body ?? {});
  }

  @Delete(':id/musicians/:musicianId')
  removeMusician(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
    @Param('musicianId') musicianId: string,
  ) {
    return this.eventsService.removeMusician(user.id, organizationId, id, musicianId);
  }
}
