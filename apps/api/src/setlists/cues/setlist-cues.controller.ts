import { Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../auth/current-user.decorator';
import { SetlistCuesService } from './setlist-cues.service';

@Controller('api/setlists')
@UseGuards(AuthGuard)
export class SetlistCuesController {
  constructor(@Inject(SetlistCuesService) private readonly cuesService: SetlistCuesService) {}

  @Get(':setlistId/production')
  production(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('setlistId') setlistId: string) {
    return this.cuesService.production(user.id, organizationId, setlistId);
  }

  @Get(':setlistId/items/:itemId/cues')
  listByItem(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.cuesService.listByItem(user.id, organizationId, setlistId, itemId);
  }

  @Post(':setlistId/items/:itemId/cues/copy')
  copy(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.cuesService.copy(user.id, organizationId, setlistId, itemId, body ?? {});
  }

  @Get(':setlistId/cues')
  list(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('setlistId') setlistId: string) {
    return this.cuesService.list(user.id, organizationId, setlistId);
  }

  @Post(':setlistId/cues')
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('setlistId') setlistId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.cuesService.create(user.id, organizationId, setlistId, body ?? {});
  }

  // PATCH .../cues/reorder debe registrarse antes que PATCH .../cues/:cueId
  // (Express resolveria ":cueId" con "reorder" si se registrara despues).
  @Patch(':setlistId/cues/reorder')
  reorder(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('setlistId') setlistId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.cuesService.reorder(user.id, organizationId, setlistId, body ?? {});
  }

  @Get(':setlistId/cues/:cueId')
  get(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('setlistId') setlistId: string,
    @Param('cueId') cueId: string,
  ) {
    return this.cuesService.get(user.id, organizationId, setlistId, cueId);
  }

  @Patch(':setlistId/cues/:cueId')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('setlistId') setlistId: string,
    @Param('cueId') cueId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.cuesService.update(user.id, organizationId, setlistId, cueId, body ?? {});
  }

  @Patch(':setlistId/cues/:cueId/status')
  updateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('setlistId') setlistId: string,
    @Param('cueId') cueId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.cuesService.updateStatus(user.id, organizationId, setlistId, cueId, body ?? {});
  }

  @Post(':setlistId/cues/:cueId/duplicate')
  duplicate(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('setlistId') setlistId: string,
    @Param('cueId') cueId: string,
  ) {
    return this.cuesService.duplicate(user.id, organizationId, setlistId, cueId);
  }

  @Delete(':setlistId/cues/:cueId')
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('setlistId') setlistId: string,
    @Param('cueId') cueId: string,
  ) {
    return this.cuesService.remove(user.id, organizationId, setlistId, cueId);
  }
}
