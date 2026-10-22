import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  createSongVersionSchema,
  updateSongVersionSchema,
  type CreateSongVersionData,
  type UpdateSongVersionData,
} from '@harmonyhub/contracts';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentMembership, OrgMember } from '../../permissions/current-membership.decorator';
import { PermissionsGuard } from '../../permissions/permissions.guard';
import { RequirePermission } from '../../permissions/require-permission.decorator';
import { ZodPipe } from '../../shared/zod.pipe';
import { SongVersionsService } from './song-versions.service';

/** Versiones de una cancion. Mismas rutas que antes (api/songs/:id/...). */
@Controller('api/songs')
@UseGuards(AuthGuard, PermissionsGuard)
export class SongVersionsController {
  constructor(@Inject(SongVersionsService) private readonly versionsService: SongVersionsService) {}

  @Get(':id/versions')
  @RequirePermission('read')
  versions(@CurrentMembership() member: OrgMember, @Param('id') id: string) {
    return this.versionsService.versions(member, id);
  }

  @Get(':id/versions/:versionId')
  @RequirePermission('read')
  version(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('versionId') versionId: string) {
    return this.versionsService.version(member, id, versionId);
  }

  @Post(':id/versions')
  @RequirePermission('songs.manage')
  createVersion(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body(new ZodPipe(createSongVersionSchema)) body: CreateSongVersionData) {
    return this.versionsService.createVersion(member, id, body);
  }

  @Patch(':id/versions/:versionId')
  @RequirePermission('songs.manage')
  updateVersion(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('versionId') versionId: string, @Body(new ZodPipe(updateSongVersionSchema)) body: UpdateSongVersionData) {
    return this.versionsService.updateVersion(member, id, versionId, body);
  }

  @Post(':id/versions/:versionId/set-default')
  @RequirePermission('songs.manage')
  setDefaultVersion(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('versionId') versionId: string) {
    return this.versionsService.setDefaultVersion(member, id, versionId);
  }

  @Delete(':id/versions/:versionId')
  @RequirePermission('songs.manage')
  deleteVersion(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('versionId') versionId: string) {
    return this.versionsService.deleteVersion(member, id, versionId);
  }
}
