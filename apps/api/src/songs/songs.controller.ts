import { Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post, Query, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
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
  tracks(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Query() query: Record<string, unknown>) {
    return this.songsService.tracks(user.id, organizationId, id, query);
  }

  @Get(':id/tracks/:trackId')
  track(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('trackId') trackId: string) {
    return this.songsService.track(user.id, organizationId, id, trackId);
  }

  @Get(':id/tracks/:trackId/stream')
  async streamTrack(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('trackId') trackId: string, @Res({ passthrough: true }) response: any) {
    const track = await this.songsService.trackAsset(user.id, organizationId, id, trackId);

    if ((track.provider === 'EXTERNAL_URL' || track.provider === 'OTHER') && track.url) {
      response.redirect(track.url);
      return;
    }

    if (!track.storageKey) {
      response.status(404);
      return { message: 'Archivo no disponible' };
    }

    response.setHeader('Content-Type', track.mimeType || 'application/octet-stream');
    if (track.sizeBytes) response.setHeader('Content-Length', String(track.sizeBytes));
    return new StreamableFile(await this.songsService.storageStream(track.storageKey));
  }

  @Get(':id/tracks/:trackId/download')
  async downloadTrack(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('trackId') trackId: string, @Res({ passthrough: true }) response: any) {
    const track = await this.songsService.trackAsset(user.id, organizationId, id, trackId);
    const fileName = await this.songsService.downloadFileName(user.id, organizationId, id, trackId);

    if ((track.provider === 'EXTERNAL_URL' || track.provider === 'OTHER') && track.url) {
      response.redirect(track.url);
      return;
    }

    if (!track.storageKey) {
      response.status(404);
      return { message: 'Archivo no disponible' };
    }

    response.setHeader('Content-Type', track.mimeType || 'application/octet-stream');
    response.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    if (track.sizeBytes) response.setHeader('Content-Length', String(track.sizeBytes));
    return new StreamableFile(await this.songsService.storageStream(track.storageKey));
  }

  @Get(':id/links')
  links(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Query() query: Record<string, unknown>) {
    return this.songsService.links(user.id, organizationId, id, query);
  }

  @Get(':id/links/:linkId')
  link(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('linkId') linkId: string) {
    return this.songsService.link(user.id, organizationId, id, linkId);
  }

  @Get(':id/files')
  files(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Query() query: Record<string, unknown>) {
    return this.songsService.files(user.id, organizationId, id, query);
  }

  @Get(':id/files/:songFileId')
  file(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('songFileId') songFileId: string) {
    return this.songsService.file(user.id, organizationId, id, songFileId);
  }

  @Get(':id/files/:songFileId/stream')
  async streamSongFile(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('songFileId') songFileId: string, @Res({ passthrough: true }) response: any) {
    const context = await this.songsService.songFileAsset(user.id, organizationId, id, songFileId);
    if (!context.file.storageKey) {
      response.status(404);
      return { message: 'Archivo no disponible' };
    }

    response.setHeader('Content-Type', context.file.mimeType || 'application/octet-stream');
    if (context.file.sizeBytes) response.setHeader('Content-Length', String(context.file.sizeBytes));
    return new StreamableFile(await this.songsService.songFileStream(context.file.storageKey));
  }

  @Get(':id/files/:songFileId/download')
  async downloadSongFile(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('songFileId') songFileId: string, @Res({ passthrough: true }) response: any) {
    const context = await this.songsService.songFileAsset(user.id, organizationId, id, songFileId);
    if (!context.file.storageKey) {
      response.status(404);
      return { message: 'Archivo no disponible' };
    }

    const fileName = await this.songsService.downloadSongFileName(user.id, organizationId, id, songFileId);
    response.setHeader('Content-Type', context.file.mimeType || 'application/octet-stream');
    response.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    if (context.file.sizeBytes) response.setHeader('Content-Length', String(context.file.sizeBytes));
    return new StreamableFile(await this.songsService.songFileStream(context.file.storageKey));
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

  // PATCH .../links/reorder debe registrarse antes que PATCH .../links/:linkId:
  // Express resuelve rutas en orden de registro y ":linkId" capturaria "reorder".
  @Patch(':id/links/reorder')
  reorderLinks(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.songsService.reorderLinks(user.id, organizationId, id, body ?? {});
  }

  @Patch(':id/links/:linkId')
  updateLink(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('linkId') linkId: string, @Body() body: Record<string, unknown>) {
    return this.songsService.updateLink(user.id, organizationId, id, linkId, body ?? {});
  }

  @Delete(':id/links/:linkId')
  deleteLink(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('linkId') linkId: string) {
    return this.songsService.deleteLink(user.id, organizationId, id, linkId);
  }

  @Post(':id/links/:linkId/set-primary')
  setPrimaryLink(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('linkId') linkId: string) {
    return this.songsService.setPrimaryLink(user.id, organizationId, id, linkId);
  }

  @Post(':id/tracks')
  createTrack(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.songsService.createTrack(user.id, organizationId, id, body ?? {});
  }

  @Post(':id/tracks/upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadTrack(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Body() body: Record<string, unknown>, @UploadedFile() file?: { buffer: Buffer; size: number; mimetype: string; originalname: string }) {
    return this.songsService.uploadTrack(user.id, organizationId, id, body ?? {}, file);
  }

  // PATCH .../tracks/reorder debe registrarse antes que PATCH .../tracks/:trackId
  // (mismo motivo que en links/reorder mas arriba).
  @Patch(':id/tracks/reorder')
  reorderTracks(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.songsService.reorderTracks(user.id, organizationId, id, body ?? {});
  }

  @Patch(':id/tracks/:trackId')
  updateTrack(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('trackId') trackId: string, @Body() body: Record<string, unknown>) {
    return this.songsService.updateTrack(user.id, organizationId, id, trackId, body ?? {});
  }

  @Delete(':id/tracks/:trackId')
  deleteTrack(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('trackId') trackId: string) {
    return this.songsService.deleteTrack(user.id, organizationId, id, trackId);
  }

  @Post(':id/tracks/:trackId/set-primary')
  setPrimaryTrack(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('trackId') trackId: string) {
    return this.songsService.setPrimaryTrack(user.id, organizationId, id, trackId);
  }

  @Post(':id/tracks/copy')
  copyTracks(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.songsService.copyTrackReferences(user.id, organizationId, id, body ?? {});
  }

  @Post(':id/files/upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadSongFile(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Body() body: Record<string, unknown>, @UploadedFile() file?: { buffer: Buffer; size: number; mimetype: string; originalname: string }) {
    return this.songsService.uploadSongFile(user.id, organizationId, id, body ?? {}, file);
  }

  // PATCH .../files/reorder debe registrarse antes que PATCH .../files/:songFileId
  // (mismo motivo que en links/reorder y tracks/reorder mas arriba).
  @Patch(':id/files/reorder')
  reorderSongFiles(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.songsService.reorderSongFiles(user.id, organizationId, id, body ?? {});
  }

  @Patch(':id/files/:songFileId')
  updateSongFile(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('songFileId') songFileId: string, @Body() body: Record<string, unknown>) {
    return this.songsService.updateSongFile(user.id, organizationId, id, songFileId, body ?? {});
  }

  @Delete(':id/files/:songFileId')
  deleteSongFile(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('songFileId') songFileId: string) {
    return this.songsService.deleteSongFile(user.id, organizationId, id, songFileId);
  }

  @Post(':id/files/:songFileId/set-primary')
  setPrimarySongFile(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('songFileId') songFileId: string) {
    return this.songsService.setPrimarySongFile(user.id, organizationId, id, songFileId);
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
