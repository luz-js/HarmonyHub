import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { SetlistCuesService } from './setlist-cues.service';
import { CurrentMembership, OrgMember } from '../../permissions/current-membership.decorator';
import { PermissionsGuard } from '../../permissions/permissions.guard';
import { RequirePermission } from '../../permissions/require-permission.decorator';

@Controller('api/setlists')
@UseGuards(AuthGuard, PermissionsGuard)
export class SetlistCuesController {
  constructor(@Inject(SetlistCuesService) private readonly cuesService: SetlistCuesService) {}

  @Get(':setlistId/production')
  @RequirePermission('read')
  production(@CurrentMembership() member: OrgMember, @Param('setlistId') setlistId: string) {
    return this.cuesService.production(member, setlistId);
  }

  @Get(':setlistId/items/:itemId/cues')
  @RequirePermission('read')
  listByItem(
    @CurrentMembership() member: OrgMember,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.cuesService.listByItem(member, setlistId, itemId);
  }

  @Post(':setlistId/items/:itemId/cues/copy')
  @RequirePermission('setlists.cues.manage')
  copy(
    @CurrentMembership() member: OrgMember,
    @Param('setlistId') setlistId: string,
    @Param('itemId') itemId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.cuesService.copy(member, setlistId, itemId, body ?? {});
  }

  @Get(':setlistId/cues')
  @RequirePermission('read')
  list(@CurrentMembership() member: OrgMember, @Param('setlistId') setlistId: string) {
    return this.cuesService.list(member, setlistId);
  }

  @Post(':setlistId/cues')
  @RequirePermission('setlists.cues.manage')
  create(
    @CurrentMembership() member: OrgMember,
    @Param('setlistId') setlistId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.cuesService.create(member, setlistId, body ?? {});
  }

  // PATCH .../cues/reorder debe registrarse antes que PATCH .../cues/:cueId
  // (Express resolveria ":cueId" con "reorder" si se registrara despues).
  @Patch(':setlistId/cues/reorder')
  @RequirePermission('setlists.cues.manage')
  reorder(
    @CurrentMembership() member: OrgMember,
    @Param('setlistId') setlistId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.cuesService.reorder(member, setlistId, body ?? {});
  }

  @Get(':setlistId/cues/:cueId')
  @RequirePermission('read')
  get(
    @CurrentMembership() member: OrgMember,
    @Param('setlistId') setlistId: string,
    @Param('cueId') cueId: string,
  ) {
    return this.cuesService.get(member, setlistId, cueId);
  }

  @Patch(':setlistId/cues/:cueId')
  @RequirePermission('setlists.cues.manage')
  update(
    @CurrentMembership() member: OrgMember,
    @Param('setlistId') setlistId: string,
    @Param('cueId') cueId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.cuesService.update(member, setlistId, cueId, body ?? {});
  }

  @Patch(':setlistId/cues/:cueId/status')
  @RequirePermission('read')
  updateStatus(
    @CurrentMembership() member: OrgMember,
    @Param('setlistId') setlistId: string,
    @Param('cueId') cueId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.cuesService.updateStatus(member, setlistId, cueId, body ?? {});
  }

  @Post(':setlistId/cues/:cueId/duplicate')
  @RequirePermission('setlists.cues.manage')
  duplicate(
    @CurrentMembership() member: OrgMember,
    @Param('setlistId') setlistId: string,
    @Param('cueId') cueId: string,
  ) {
    return this.cuesService.duplicate(member, setlistId, cueId);
  }

  @Delete(':setlistId/cues/:cueId')
  @RequirePermission('setlists.cues.manage')
  remove(
    @CurrentMembership() member: OrgMember,
    @Param('setlistId') setlistId: string,
    @Param('cueId') cueId: string,
  ) {
    return this.cuesService.remove(member, setlistId, cueId);
  }
}
