import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { dashboardActivityQuerySchema, type DashboardActivityQueryData } from '@harmonyhub/contracts';
import { ZodPipe } from '../shared/zod.pipe';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentMembership, OrgMember } from '../permissions/current-membership.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { DashboardService } from './dashboard.service';

@Controller('api/dashboard')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermission('read')
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly dashboardService: DashboardService) {}

  @Get('summary')
  summary(@CurrentMembership() member: OrgMember) {
    return this.dashboardService.summary(member);
  }

  @Get('activity')
  activity(@CurrentMembership() member: OrgMember, @Query(new ZodPipe(dashboardActivityQuerySchema, 'Filtros invalidos')) query: DashboardActivityQueryData) {
    return this.dashboardService.activity(member, query);
  }
}
