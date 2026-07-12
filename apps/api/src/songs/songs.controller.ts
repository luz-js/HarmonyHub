import { Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { SongsService } from './songs.service';

@Controller('api/songs')
@UseGuards(AuthGuard)
export class SongsController {
  constructor(@Inject(SongsService) private readonly songsService: SongsService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Query() query: Record<string, unknown>) {
    return this.songsService.list(user.id, organizationId || String(query.organizationId || ''), query);
  }

  @Get(':id')
  detail(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string) {
    return this.songsService.detail(user.id, organizationId, id);
  }

  @Get(':id/versions')
  versions(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string) {
    return this.songsService.versions(user.id, organizationId, id);
  }

  @Get(':id/versions/:versionId')
  version(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('versionId') versionId: string) {
    return this.songsService.version(user.id, organizationId, id, versionId);
  }

  @Get(':id/tracks')
  tracks(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string) {
    return this.songsService.tracks(user.id, organizationId, id);
  }

  @Get(':id/links')
  links(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string) {
    return this.songsService.links(user.id, organizationId, id);
  }

  @Get(':id/files')
  files(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string) {
    return this.songsService.files(user.id, organizationId, id);
  }

  @Get(':id/notes')
  notes(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string) {
    return this.songsService.notes(user.id, organizationId, id);
  }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Body() body: Record<string, unknown>) {
    return this.songsService.create(user.id, organizationId, body ?? {});
  }

  @Post(':id/versions')
  createVersion(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.songsService.createVersion(user.id, organizationId, id, body ?? {});
  }

  @Patch(':id/versions/:versionId')
  updateVersion(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('versionId') versionId: string, @Body() body: Record<string, unknown>) {
    return this.songsService.updateVersion(user.id, organizationId, id, versionId, body ?? {});
  }

  @Post(':id/versions/:versionId/set-default')
  setDefaultVersion(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('versionId') versionId: string) {
    return this.songsService.setDefaultVersion(user.id, organizationId, id, versionId);
  }

  @Delete(':id/versions/:versionId')
  deleteVersion(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('versionId') versionId: string) {
    return this.songsService.deleteVersion(user.id, organizationId, id, versionId);
  }

  @Post(':id/links')
  createLink(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.songsService.createLink(user.id, organizationId, id, body ?? {});
  }

  @Patch(':id/links/:linkId')
  updateLink(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('linkId') linkId: string, @Body() body: Record<string, unknown>) {
    return this.songsService.updateLink(user.id, organizationId, id, linkId, body ?? {});
  }

  @Post(':id/notes')
  createNote(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.songsService.createNote(user.id, organizationId, id, body ?? {});
  }

  @Patch(':id/notes/:noteId')
  updateNote(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('noteId') noteId: string, @Body() body: Record<string, unknown>) {
    return this.songsService.updateNote(user.id, organizationId, id, noteId, body ?? {});
  }

  @Post(':id/tracks')
  createTrack(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.songsService.createTrack(user.id, organizationId, id, body ?? {});
  }

  @Patch(':id/tracks/:trackId')
  updateTrack(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('trackId') trackId: string, @Body() body: Record<string, unknown>) {
    return this.songsService.updateTrack(user.id, organizationId, id, trackId, body ?? {});
  }

  @Patch(':id')
  update(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.songsService.update(user.id, organizationId, id, body ?? {});
  }

  @Delete(':id')
  archive(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string) {
    return this.songsService.archive(user.id, organizationId, id);
  }
}
