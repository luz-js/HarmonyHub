import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import {
  copySongTracksSchema,
  createSongLinkSchema,
  createSongSchema,
  createSongTrackSchema,
  createSongVersionSchema,
  reorderSongFilesSchema,
  reorderSongLinksSchema,
  reorderSongTracksSchema,
  songFileListQuerySchema,
  songLinkListQuerySchema,
  songTrackListQuerySchema,
  updateSongFileSchema,
  updateSongLinkSchema,
  updateSongSchema,
  updateSongTrackSchema,
  updateSongVersionSchema,
  type CopySongTracksData,
  type CreateSongData,
  type CreateSongLinkData,
  type CreateSongTrackData,
  type CreateSongVersionData,
  type ReorderSongFilesData,
  type ReorderSongLinksData,
  type ReorderSongTracksData,
  type SongFileListQueryData,
  type SongLinkListQueryData,
  type SongTrackListQueryData,
  type UpdateSongData,
  type UpdateSongFileData,
  type UpdateSongLinkData,
  type UpdateSongTrackData,
  type UpdateSongVersionData,
} from '@harmonyhub/contracts';
import { ZodPipe } from '../shared/zod.pipe';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../auth/auth.guard';
import { SongsService } from './songs.service';
import { CurrentMembership, OrgMember } from '../permissions/current-membership.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';

@Controller('api/songs')
@UseGuards(AuthGuard, PermissionsGuard)
export class SongsController {
  constructor(@Inject(SongsService) private readonly songsService: SongsService) {}

  @Get()
  @RequirePermission('read', { organizationFrom: 'headerOrQuery' })
  list(@CurrentMembership() member: OrgMember, @Query() query: Record<string, unknown>) {
    return this.songsService.list(member, query);
  }

  @Get(':id')
  @RequirePermission('read')
  detail(@CurrentMembership() member: OrgMember, @Param('id') id: string) {
    return this.songsService.detail(member, id);
  }

  @Get(':id/versions')
  @RequirePermission('read')
  versions(@CurrentMembership() member: OrgMember, @Param('id') id: string) {
    return this.songsService.versions(member, id);
  }

  @Get(':id/versions/:versionId')
  @RequirePermission('read')
  version(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('versionId') versionId: string) {
    return this.songsService.version(member, id, versionId);
  }

  @Get(':id/tracks')
  @RequirePermission('read')
  tracks(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Query(new ZodPipe(songTrackListQuerySchema)) query: SongTrackListQueryData) {
    return this.songsService.tracks(member, id, query);
  }

  @Get(':id/tracks/:trackId')
  @RequirePermission('read')
  track(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('trackId') trackId: string) {
    return this.songsService.track(member, id, trackId);
  }

  @Get(':id/tracks/:trackId/stream')
  @RequirePermission('read')
  async streamTrack(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('trackId') trackId: string, @Res({ passthrough: true }) response: any) {
    const track = await this.songsService.trackAsset(member, id, trackId);

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
  @RequirePermission('read')
  async downloadTrack(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('trackId') trackId: string, @Res({ passthrough: true }) response: any) {
    const track = await this.songsService.trackAsset(member, id, trackId);
    const fileName = await this.songsService.downloadFileName(member, id, trackId);

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
  @RequirePermission('read')
  links(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Query(new ZodPipe(songLinkListQuerySchema)) query: SongLinkListQueryData) {
    return this.songsService.links(member, id, query);
  }

  @Get(':id/links/:linkId')
  @RequirePermission('read')
  link(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('linkId') linkId: string) {
    return this.songsService.link(member, id, linkId);
  }

  @Get(':id/files')
  @RequirePermission('read')
  files(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Query(new ZodPipe(songFileListQuerySchema)) query: SongFileListQueryData) {
    return this.songsService.files(member, id, query);
  }

  @Get(':id/files/:songFileId')
  @RequirePermission('read')
  file(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('songFileId') songFileId: string) {
    return this.songsService.file(member, id, songFileId);
  }

  @Get(':id/files/:songFileId/stream')
  @RequirePermission('read')
  async streamSongFile(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('songFileId') songFileId: string, @Res({ passthrough: true }) response: any) {
    const context = await this.songsService.songFileAsset(member, id, songFileId);
    if (!context.file.storageKey) {
      response.status(404);
      return { message: 'Archivo no disponible' };
    }

    response.setHeader('Content-Type', context.file.mimeType || 'application/octet-stream');
    if (context.file.sizeBytes) response.setHeader('Content-Length', String(context.file.sizeBytes));
    return new StreamableFile(await this.songsService.songFileStream(context.file.storageKey));
  }

  @Get(':id/files/:songFileId/download')
  @RequirePermission('read')
  async downloadSongFile(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('songFileId') songFileId: string, @Res({ passthrough: true }) response: any) {
    const context = await this.songsService.songFileAsset(member, id, songFileId);
    if (!context.file.storageKey) {
      response.status(404);
      return { message: 'Archivo no disponible' };
    }

    const fileName = await this.songsService.downloadSongFileName(member, id, songFileId);
    response.setHeader('Content-Type', context.file.mimeType || 'application/octet-stream');
    response.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    if (context.file.sizeBytes) response.setHeader('Content-Length', String(context.file.sizeBytes));
    return new StreamableFile(await this.songsService.songFileStream(context.file.storageKey));
  }

  @Post()
  @RequirePermission('songs.manage')
  create(@CurrentMembership() member: OrgMember, @Body(new ZodPipe(createSongSchema)) body: CreateSongData) {
    return this.songsService.create(member, body);
  }

  @Post(':id/versions')
  @RequirePermission('songs.manage')
  createVersion(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body(new ZodPipe(createSongVersionSchema)) body: CreateSongVersionData) {
    return this.songsService.createVersion(member, id, body);
  }

  @Patch(':id/versions/:versionId')
  @RequirePermission('songs.manage')
  updateVersion(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('versionId') versionId: string, @Body(new ZodPipe(updateSongVersionSchema)) body: UpdateSongVersionData) {
    return this.songsService.updateVersion(member, id, versionId, body);
  }

  @Post(':id/versions/:versionId/set-default')
  @RequirePermission('songs.manage')
  setDefaultVersion(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('versionId') versionId: string) {
    return this.songsService.setDefaultVersion(member, id, versionId);
  }

  @Delete(':id/versions/:versionId')
  @RequirePermission('songs.manage')
  deleteVersion(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('versionId') versionId: string) {
    return this.songsService.deleteVersion(member, id, versionId);
  }

  @Post(':id/links')
  @RequirePermission('songs.manage')
  createLink(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body(new ZodPipe(createSongLinkSchema)) body: CreateSongLinkData) {
    return this.songsService.createLink(member, id, body);
  }

  // PATCH .../links/reorder debe registrarse antes que PATCH .../links/:linkId:
  // Express resuelve rutas en orden de registro y ":linkId" capturaria "reorder".
  @Patch(':id/links/reorder')
  @RequirePermission('songs.manage')
  reorderLinks(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body(new ZodPipe(reorderSongLinksSchema)) body: ReorderSongLinksData) {
    return this.songsService.reorderLinks(member, id, body);
  }

  @Patch(':id/links/:linkId')
  @RequirePermission('songs.manage')
  updateLink(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('linkId') linkId: string, @Body(new ZodPipe(updateSongLinkSchema)) body: UpdateSongLinkData) {
    return this.songsService.updateLink(member, id, linkId, body);
  }

  @Delete(':id/links/:linkId')
  @RequirePermission('songs.manage')
  deleteLink(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('linkId') linkId: string) {
    return this.songsService.deleteLink(member, id, linkId);
  }

  @Post(':id/links/:linkId/set-primary')
  @RequirePermission('songs.manage')
  setPrimaryLink(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('linkId') linkId: string) {
    return this.songsService.setPrimaryLink(member, id, linkId);
  }

  @Post(':id/tracks')
  @RequirePermission('songs.manage')
  createTrack(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body(new ZodPipe(createSongTrackSchema)) body: CreateSongTrackData) {
    return this.songsService.createTrack(member, id, body);
  }

  @Post(':id/tracks/upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @RequirePermission('songs.manage')
  uploadTrack(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body() body: Record<string, unknown>, @UploadedFile() file?: { buffer: Buffer; size: number; mimetype: string; originalname: string }) {
    return this.songsService.uploadTrack(member, id, body ?? {}, file);
  }

  // PATCH .../tracks/reorder debe registrarse antes que PATCH .../tracks/:trackId
  // (mismo motivo que en links/reorder mas arriba).
  @Patch(':id/tracks/reorder')
  @RequirePermission('songs.manage')
  reorderTracks(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body(new ZodPipe(reorderSongTracksSchema)) body: ReorderSongTracksData) {
    return this.songsService.reorderTracks(member, id, body);
  }

  @Patch(':id/tracks/:trackId')
  @RequirePermission('songs.manage')
  updateTrack(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('trackId') trackId: string, @Body(new ZodPipe(updateSongTrackSchema)) body: UpdateSongTrackData) {
    return this.songsService.updateTrack(member, id, trackId, body);
  }

  @Delete(':id/tracks/:trackId')
  @RequirePermission('songs.manage')
  deleteTrack(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('trackId') trackId: string) {
    return this.songsService.deleteTrack(member, id, trackId);
  }

  @Post(':id/tracks/:trackId/set-primary')
  @RequirePermission('songs.manage')
  setPrimaryTrack(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('trackId') trackId: string) {
    return this.songsService.setPrimaryTrack(member, id, trackId);
  }

  @Post(':id/tracks/copy')
  @RequirePermission('songs.manage')
  copyTracks(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body(new ZodPipe(copySongTracksSchema)) body: CopySongTracksData) {
    return this.songsService.copyTrackReferences(member, id, body);
  }

  @Post(':id/files/upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @RequirePermission('songs.manage')
  uploadSongFile(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body() body: Record<string, unknown>, @UploadedFile() file?: { buffer: Buffer; size: number; mimetype: string; originalname: string }) {
    return this.songsService.uploadSongFile(member, id, body ?? {}, file);
  }

  // PATCH .../files/reorder debe registrarse antes que PATCH .../files/:songFileId
  // (mismo motivo que en links/reorder y tracks/reorder mas arriba).
  @Patch(':id/files/reorder')
  @RequirePermission('songs.manage')
  reorderSongFiles(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body(new ZodPipe(reorderSongFilesSchema)) body: ReorderSongFilesData) {
    return this.songsService.reorderSongFiles(member, id, body);
  }

  @Patch(':id/files/:songFileId')
  @RequirePermission('songs.manage')
  updateSongFile(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('songFileId') songFileId: string, @Body(new ZodPipe(updateSongFileSchema)) body: UpdateSongFileData) {
    return this.songsService.updateSongFile(member, id, songFileId, body);
  }

  @Delete(':id/files/:songFileId')
  @RequirePermission('songs.manage')
  deleteSongFile(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('songFileId') songFileId: string) {
    return this.songsService.deleteSongFile(member, id, songFileId);
  }

  @Post(':id/files/:songFileId/set-primary')
  @RequirePermission('songs.manage')
  setPrimarySongFile(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('songFileId') songFileId: string) {
    return this.songsService.setPrimarySongFile(member, id, songFileId);
  }

  @Patch(':id')
  @RequirePermission('songs.manage')
  update(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body(new ZodPipe(updateSongSchema)) body: UpdateSongData) {
    return this.songsService.update(member, id, body);
  }

  @Delete(':id')
  @RequirePermission('songs.manage')
  archive(@CurrentMembership() member: OrgMember, @Param('id') id: string) {
    return this.songsService.archive(member, id);
  }
}
