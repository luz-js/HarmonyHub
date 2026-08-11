import { Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../auth/current-user.decorator';
import { SetlistItemsService } from './setlist-items.service';

@Controller('api/setlists')
@UseGuards(AuthGuard)
export class SetlistItemsController {
  constructor(@Inject(SetlistItemsService) private readonly itemsService: SetlistItemsService) {}

  @Get(':setlistId/items')
  list(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('setlistId') setlistId: string) {
    return this.itemsService.list(user.id, organizationId, setlistId);
  }

  @Post(':setlistId/items')
  create(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('setlistId') setlistId: string, @Body() body: Record<string, unknown>) {
    return this.itemsService.create(user.id, organizationId, setlistId, body ?? {});
  }

  // PATCH .../items/reorder debe registrarse antes que PATCH .../items/:itemId
  // (Express resolveria ":itemId" con "reorder" si se registrara despues).
  @Patch(':setlistId/items/reorder')
  reorder(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('setlistId') setlistId: string, @Body() body: Record<string, unknown>) {
    return this.itemsService.reorder(user.id, organizationId, setlistId, body ?? {});
  }

  @Get(':setlistId/items/:itemId')
  get(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('setlistId') setlistId: string, @Param('itemId') itemId: string) {
    return this.itemsService.get(user.id, organizationId, setlistId, itemId);
  }

  @Patch(':setlistId/items/:itemId')
  update(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('setlistId') setlistId: string, @Param('itemId') itemId: string, @Body() body: Record<string, unknown>) {
    return this.itemsService.update(user.id, organizationId, setlistId, itemId, body ?? {});
  }

  @Delete(':setlistId/items/:itemId')
  remove(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('setlistId') setlistId: string, @Param('itemId') itemId: string) {
    return this.itemsService.remove(user.id, organizationId, setlistId, itemId);
  }

  @Post(':setlistId/items/:itemId/duplicate')
  duplicate(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.itemsService.duplicate(user.id, organizationId, setlistId, itemId, body?.includeCues === true);
  }
}
