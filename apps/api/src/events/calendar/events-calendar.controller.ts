import { Controller, Get, Inject, Param, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentMembership, OrgMember } from '../../permissions/current-membership.decorator';
import { PermissionsGuard } from '../../permissions/permissions.guard';
import { RequirePermission } from '../../permissions/require-permission.decorator';
import { EventsCalendarService } from './events-calendar.service';

/** Lo minimo de Express que se usa para descargar el archivo. */
type DownloadResponse = { setHeader(name: string, value: string): void };

function asDownload(response: DownloadResponse, file: { fileName: string; body: string }) {
  response.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  response.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
  response.setHeader('Cache-Control', 'no-store');
  return file.body;
}

/** Descargar eventos como calendario (.ics) para Google Calendar, Apple Calendar, Outlook... */
@Controller('api')
@UseGuards(AuthGuard, PermissionsGuard)
export class EventsCalendarController {
  constructor(@Inject(EventsCalendarService) private readonly calendar: EventsCalendarService) {}

  @Get('events/:id/ical')
  @RequirePermission('read')
  async event(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Res({ passthrough: true }) response: DownloadResponse) {
    return asDownload(response, await this.calendar.eventCalendar(member, id));
  }

  /** Mis proximos eventos de la organizacion activa (no esta bajo /api/events para no chocar con /api/events/:id). */
  @Get('calendar/my-events.ics')
  @RequirePermission('read')
  async myEvents(@CurrentMembership() member: OrgMember, @Res({ passthrough: true }) response: DownloadResponse) {
    return asDownload(response, await this.calendar.myUpcomingCalendar(member));
  }
}
