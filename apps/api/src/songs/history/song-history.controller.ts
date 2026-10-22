import { BadRequestException, Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { restoreSongRevisionSchema, songActivityListQuerySchema, type RestoreSongRevisionData, type SongActivityListQueryData } from '@harmonyhub/contracts';
import { ZodPipe } from '../../shared/zod.pipe';
import { AuthGuard } from '../../auth/auth.guard';
import { SongActivityService } from '../activity/song-activity.service';
import { SongRevisionsService } from './song-revisions.service';
import { CurrentMembership, OrgMember } from '../../permissions/current-membership.decorator';
import { PermissionsGuard } from '../../permissions/permissions.guard';
import { RequirePermission } from '../../permissions/require-permission.decorator';

function parseRevisionNumber(value: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new BadRequestException('Numero de revision invalido');
  return parsed;
}

@Controller('api/songs')
@UseGuards(AuthGuard, PermissionsGuard)
export class SongHistoryController {
  constructor(
    @Inject(SongActivityService) private readonly activityService: SongActivityService,
    @Inject(SongRevisionsService) private readonly revisionsService: SongRevisionsService,
  ) {}

  @Get(':id/activity')
  @RequirePermission('read')
  activity(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Query(new ZodPipe(songActivityListQuerySchema)) query: SongActivityListQueryData) {
    return this.activityService.list(member, id, query);
  }

  @Get(':id/versions/:versionId/revisions')
  @RequirePermission('read')
  listRevisions(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('versionId') versionId: string) {
    return this.revisionsService.list(member, id, versionId);
  }

  @Get(':id/versions/:versionId/revisions/:revisionNumber')
  @RequirePermission('read')
  getRevision(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('versionId') versionId: string, @Param('revisionNumber') revisionNumber: string) {
    return this.revisionsService.get(member, id, versionId, parseRevisionNumber(revisionNumber));
  }

  @Get(':id/versions/:versionId/revisions/:revisionNumber/diff')
  @RequirePermission('read')
  diffRevision(
    @CurrentMembership() member: OrgMember,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Param('revisionNumber') revisionNumber: string,
    @Query('compareTo') compareTo?: string,
  ) {
    return this.revisionsService.diff(member, id, versionId, parseRevisionNumber(revisionNumber), compareTo ? parseRevisionNumber(compareTo) : undefined);
  }

  @Post(':id/versions/:versionId/revisions/:revisionNumber/restore')
  @RequirePermission('songs.manage')
  restore(
    @CurrentMembership() member: OrgMember,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Param('revisionNumber') revisionNumber: string,
    @Body(new ZodPipe(restoreSongRevisionSchema)) body: RestoreSongRevisionData,
  ) {
    return this.revisionsService.restore(member, id, versionId, parseRevisionNumber(revisionNumber), body);
  }
}
