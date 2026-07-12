import { Body, Controller, Get, Headers, Inject, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { MembershipsService } from './memberships.service';

@Controller('api/memberships')
@UseGuards(AuthGuard)
export class MembershipsController {
  constructor(@Inject(MembershipsService) private readonly membershipsService: MembershipsService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') headerOrganizationId: string | undefined, @Query('organizationId') queryOrganizationId: string | undefined) {
    return this.membershipsService.list(user.id, headerOrganizationId || queryOrganizationId || '');
  }

  @Patch(':id')
  update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.membershipsService.update(user.id, id, body ?? {});
  }
}
