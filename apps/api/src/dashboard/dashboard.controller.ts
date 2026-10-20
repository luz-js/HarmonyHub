import { Controller, Get, Headers, Inject, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { DashboardService } from './dashboard.service';

@Controller('api/dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly dashboardService: DashboardService) {}

  @Get('summary')
  summary(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string) {
    return this.dashboardService.summary(user.id, organizationId);
  }

  @Get('activity')
  activity(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Query() query: Record<string, unknown>) {
    return this.dashboardService.activity(user.id, organizationId, query);
  }
}
