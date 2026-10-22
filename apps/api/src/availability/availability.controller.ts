import { Body, Controller, Delete, Get, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { CurrentMembership, OrgMember } from '../permissions/current-membership.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { AvailabilityService } from './availability.service';

/** "Mi perfil" > No disponible: siempre las fechas de la persona de la sesion, en todas sus organizaciones. */
@Controller('api/me/unavailability')
@UseGuards(AuthGuard)
export class MyUnavailabilityController {
  constructor(@Inject(AvailabilityService) private readonly availability: AvailabilityService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.availability.listMine(user.id);
  }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() body: unknown) {
    return this.availability.createMine(user.id, body ?? {});
  }

  @Delete(':unavailabilityId')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('unavailabilityId') id: string) {
    return this.availability.deleteMine(user.id, id);
  }
}

/** Disponibilidad de los miembros de la organizacion activa, para quien arma equipos (sin las notas privadas). */
@Controller('api')
@UseGuards(AuthGuard, PermissionsGuard)
export class AvailabilityController {
  constructor(@Inject(AvailabilityService) private readonly availability: AvailabilityService) {}

  @Get('availability')
  @RequirePermission('availability.read')
  unavailable(@CurrentMembership() member: OrgMember, @Query() query: Record<string, unknown>) {
    return this.availability.unavailableInRange(member, query);
  }

  @Get('events/:id/availability')
  @RequirePermission('availability.read')
  forEvent(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Query() query: Record<string, unknown>) {
    return this.availability.forEvent(member, id, query);
  }

  @Get('setlists/:id/availability')
  @RequirePermission('availability.read')
  forSetlist(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Query() query: Record<string, unknown>) {
    return this.availability.forSetlist(member, id, query);
  }
}
