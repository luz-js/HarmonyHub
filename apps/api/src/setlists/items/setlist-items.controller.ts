import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  createSetlistItemSchema,
  reorderSetlistItemsSchema,
  updateSetlistItemSchema,
  type CreateSetlistItemData,
  type ReorderSetlistItemsData,
  type UpdateSetlistItemData,
} from '@harmonyhub/contracts';
import { ZodPipe } from '../../shared/zod.pipe';
import { AuthGuard } from '../../auth/auth.guard';
import { SetlistItemsService } from './setlist-items.service';
import { CurrentMembership, OrgMember } from '../../permissions/current-membership.decorator';
import { PermissionsGuard } from '../../permissions/permissions.guard';
import { RequirePermission } from '../../permissions/require-permission.decorator';

@Controller('api/setlists')
@UseGuards(AuthGuard, PermissionsGuard)
export class SetlistItemsController {
  constructor(@Inject(SetlistItemsService) private readonly itemsService: SetlistItemsService) {}

  @Get(':setlistId/items')
  @RequirePermission('read')
  list(@CurrentMembership() member: OrgMember, @Param('setlistId') setlistId: string) {
    return this.itemsService.list(member, setlistId);
  }

  @Post(':setlistId/items')
  @RequirePermission('setlists.manage')
  create(@CurrentMembership() member: OrgMember, @Param('setlistId') setlistId: string, @Body(new ZodPipe(createSetlistItemSchema)) body: CreateSetlistItemData) {
    return this.itemsService.create(member, setlistId, body);
  }

  // PATCH .../items/reorder debe registrarse antes que PATCH .../items/:itemId
  // (Express resolveria ":itemId" con "reorder" si se registrara despues).
  @Patch(':setlistId/items/reorder')
  @RequirePermission('setlists.manage')
  reorder(@CurrentMembership() member: OrgMember, @Param('setlistId') setlistId: string, @Body(new ZodPipe(reorderSetlistItemsSchema)) body: ReorderSetlistItemsData) {
    return this.itemsService.reorder(member, setlistId, body);
  }

  @Get(':setlistId/items/:itemId')
  @RequirePermission('read')
  get(@CurrentMembership() member: OrgMember, @Param('setlistId') setlistId: string, @Param('itemId') itemId: string) {
    return this.itemsService.get(member, setlistId, itemId);
  }

  @Patch(':setlistId/items/:itemId')
  @RequirePermission('setlists.manage')
  update(@CurrentMembership() member: OrgMember, @Param('setlistId') setlistId: string, @Param('itemId') itemId: string, @Body(new ZodPipe(updateSetlistItemSchema)) body: UpdateSetlistItemData) {
    return this.itemsService.update(member, setlistId, itemId, body);
  }

  @Delete(':setlistId/items/:itemId')
  @RequirePermission('setlists.manage')
  remove(@CurrentMembership() member: OrgMember, @Param('setlistId') setlistId: string, @Param('itemId') itemId: string) {
    return this.itemsService.remove(member, setlistId, itemId);
  }

  @Post(':setlistId/items/:itemId/duplicate')
  @RequirePermission('setlists.manage')
  duplicate(
    @CurrentMembership() member: OrgMember,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.itemsService.duplicate(member, setlistId, itemId, body?.includeCues === true);
  }
}
