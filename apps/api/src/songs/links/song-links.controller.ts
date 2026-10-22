import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  createSongLinkSchema,
  reorderSongLinksSchema,
  songLinkListQuerySchema,
  updateSongLinkSchema,
  type CreateSongLinkData,
  type ReorderSongLinksData,
  type SongLinkListQueryData,
  type UpdateSongLinkData,
} from '@harmonyhub/contracts';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentMembership, OrgMember } from '../../permissions/current-membership.decorator';
import { PermissionsGuard } from '../../permissions/permissions.guard';
import { RequirePermission } from '../../permissions/require-permission.decorator';
import { ZodPipe } from '../../shared/zod.pipe';
import { SongLinksService } from './song-links.service';

/** Enlaces externos de una cancion. Mismas rutas que antes (api/songs/:id/...). */
@Controller('api/songs')
@UseGuards(AuthGuard, PermissionsGuard)
export class SongLinksController {
  constructor(@Inject(SongLinksService) private readonly linksService: SongLinksService) {}

  @Get(':id/links')
  @RequirePermission('read')
  links(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Query(new ZodPipe(songLinkListQuerySchema)) query: SongLinkListQueryData) {
    return this.linksService.links(member, id, query);
  }

  @Get(':id/links/:linkId')
  @RequirePermission('read')
  link(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('linkId') linkId: string) {
    return this.linksService.link(member, id, linkId);
  }

  @Post(':id/links')
  @RequirePermission('songs.manage')
  createLink(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body(new ZodPipe(createSongLinkSchema)) body: CreateSongLinkData) {
    return this.linksService.createLink(member, id, body);
  }

  // PATCH .../links/reorder debe registrarse antes que PATCH .../links/:linkId:
  // Express resuelve rutas en orden de registro y ":linkId" capturaria "reorder".
  @Patch(':id/links/reorder')
  @RequirePermission('songs.manage')
  reorderLinks(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body(new ZodPipe(reorderSongLinksSchema)) body: ReorderSongLinksData) {
    return this.linksService.reorderLinks(member, id, body);
  }

  @Patch(':id/links/:linkId')
  @RequirePermission('songs.manage')
  updateLink(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('linkId') linkId: string, @Body(new ZodPipe(updateSongLinkSchema)) body: UpdateSongLinkData) {
    return this.linksService.updateLink(member, id, linkId, body);
  }

  @Delete(':id/links/:linkId')
  @RequirePermission('songs.manage')
  deleteLink(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('linkId') linkId: string) {
    return this.linksService.deleteLink(member, id, linkId);
  }

  @Post(':id/links/:linkId/set-primary')
  @RequirePermission('songs.manage')
  setPrimaryLink(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('linkId') linkId: string) {
    return this.linksService.setPrimaryLink(member, id, linkId);
  }
}
