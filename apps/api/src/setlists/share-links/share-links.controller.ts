import { Body, Controller, Delete, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { createShareLinkSchema, type CreateShareLinkData } from '@harmonyhub/contracts';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentMembership, OrgMember } from '../../permissions/current-membership.decorator';
import { PermissionsGuard } from '../../permissions/permissions.guard';
import { RequirePermission } from '../../permissions/require-permission.decorator';
import { ZodPipe } from '../../shared/zod.pipe';
import { ShareLinksService } from './share-links.service';

/** Enlaces de solo lectura de un setlist: los maneja quien puede editar el setlist. */
@Controller('api/setlists/:id/share-links')
@UseGuards(AuthGuard, PermissionsGuard)
export class ShareLinksController {
  constructor(@Inject(ShareLinksService) private readonly shareLinks: ShareLinksService) {}

  @Get()
  @RequirePermission('setlists.manage')
  list(@CurrentMembership() member: OrgMember, @Param('id') id: string) {
    return this.shareLinks.list(member, id);
  }

  @Post()
  @RequirePermission('setlists.manage')
  create(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body(new ZodPipe(createShareLinkSchema)) body: CreateShareLinkData) {
    return this.shareLinks.create(member, id, body);
  }

  @Delete(':linkId')
  @RequirePermission('setlists.manage')
  revoke(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('linkId') linkId: string) {
    return this.shareLinks.revoke(member, id, linkId);
  }
}
