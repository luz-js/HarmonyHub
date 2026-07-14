import { BadRequestException, Body, Controller, Get, Headers, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../auth/current-user.decorator';
import { SongActivityService } from '../activity/song-activity.service';
import { SongRevisionsService } from './song-revisions.service';

function parseRevisionNumber(value: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new BadRequestException('Numero de revision invalido');
  return parsed;
}

@Controller('api/songs')
@UseGuards(AuthGuard)
export class SongHistoryController {
  constructor(
    @Inject(SongActivityService) private readonly activityService: SongActivityService,
    @Inject(SongRevisionsService) private readonly revisionsService: SongRevisionsService,
  ) {}

  @Get(':id/activity')
  activity(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Query() query: Record<string, unknown>) {
    return this.activityService.list(user.id, organizationId, id, query);
  }

  @Get(':id/versions/:versionId/revisions')
  listRevisions(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('versionId') versionId: string) {
    return this.revisionsService.list(user.id, organizationId, id, versionId);
  }

  @Get(':id/versions/:versionId/revisions/:revisionNumber')
  getRevision(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('versionId') versionId: string, @Param('revisionNumber') revisionNumber: string) {
    return this.revisionsService.get(user.id, organizationId, id, versionId, parseRevisionNumber(revisionNumber));
  }

  @Get(':id/versions/:versionId/revisions/:revisionNumber/diff')
  diffRevision(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Param('revisionNumber') revisionNumber: string,
    @Query('compareTo') compareTo?: string,
  ) {
    return this.revisionsService.diff(user.id, organizationId, id, versionId, parseRevisionNumber(revisionNumber), compareTo ? parseRevisionNumber(compareTo) : undefined);
  }

  @Post(':id/versions/:versionId/revisions/:revisionNumber/restore')
  restore(
    @CurrentUser() user: CurrentUserPayload,
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Param('revisionNumber') revisionNumber: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.revisionsService.restore(user.id, organizationId, id, versionId, parseRevisionNumber(revisionNumber), body ?? {});
  }
}
