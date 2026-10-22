import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { statsQuerySchema, type StatsQueryData } from '@harmonyhub/contracts';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentMembership, OrgMember } from '../permissions/current-membership.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { ZodPipe } from '../shared/zod.pipe';
import { StatsService } from './stats.service';

@Controller('api/stats')
@UseGuards(AuthGuard, PermissionsGuard)
export class StatsController {
  constructor(@Inject(StatsService) private readonly stats: StatsService) {}

  /** Repertorio: cualquier miembro. */
  @Get('repertoire')
  @RequirePermission('read')
  repertoire(@CurrentMembership() member: OrgMember, @Query(new ZodPipe(statsQuerySchema, 'Filtros invalidos')) query: StatsQueryData) {
    return this.stats.repertoire(member, query);
  }

  /** Carga por musico: quien arma los equipos de los eventos. */
  @Get('members')
  @RequirePermission('events.manage')
  members(@CurrentMembership() member: OrgMember, @Query(new ZodPipe(statsQuerySchema, 'Filtros invalidos')) query: StatsQueryData) {
    return this.stats.members(member, query);
  }
}
