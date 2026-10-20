import { Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { SetlistsService } from './setlists.service';

@Controller('api/setlists')
@UseGuards(AuthGuard)
export class SetlistsController {
  constructor(@Inject(SetlistsService) private readonly setlistsService: SetlistsService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Query() query: Record<string, unknown>) {
    return this.setlistsService.list(user.id, organizationId, query);
  }

  @Get(':id')
  detail(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string) {
    return this.setlistsService.detail(user.id, organizationId, id);
  }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Body() body: Record<string, unknown>) {
    return this.setlistsService.create(user.id, organizationId, body ?? {});
  }

  @Post(':id/save-as-template')
  saveAsTemplate(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.setlistsService.saveAsTemplate(user.id, organizationId, id, body ?? {});
  }

  @Patch(':id')
  update(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.setlistsService.update(user.id, organizationId, id, body ?? {});
  }

  @Post(':id/archive')
  archive(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string) {
    return this.setlistsService.archive(user.id, organizationId, id);
  }

  @Post(':id/publish')
  publish(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string) {
    return this.setlistsService.publish(user.id, organizationId, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string) {
    return this.setlistsService.delete(user.id, organizationId, id);
  }
}
