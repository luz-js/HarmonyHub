import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import {
  copySongTracksSchema,
  createSongTrackSchema,
  reorderSongTracksSchema,
  songTrackListQuerySchema,
  updateSongTrackSchema,
  type CopySongTracksData,
  type CreateSongTrackData,
  type ReorderSongTracksData,
  type SongTrackListQueryData,
  type UpdateSongTrackData,
} from '@harmonyhub/contracts';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentMembership, OrgMember } from '../../permissions/current-membership.decorator';
import { PermissionsGuard } from '../../permissions/permissions.guard';
import { RequirePermission } from '../../permissions/require-permission.decorator';
import { ZodPipe } from '../../shared/zod.pipe';
import { SongTracksService } from './song-tracks.service';

/** Pistas de audio de una cancion: listar, escuchar, descargar, subir y ordenar. Mismas rutas que antes (api/songs/:id/...). */
@Controller('api/songs')
@UseGuards(AuthGuard, PermissionsGuard)
export class SongTracksController {
  constructor(@Inject(SongTracksService) private readonly tracksService: SongTracksService) {}

  @Get(':id/tracks')
  @RequirePermission('read')
  tracks(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Query(new ZodPipe(songTrackListQuerySchema)) query: SongTrackListQueryData) {
    return this.tracksService.tracks(member, id, query);
  }

  @Get(':id/tracks/:trackId')
  @RequirePermission('read')
  track(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('trackId') trackId: string) {
    return this.tracksService.track(member, id, trackId);
  }

  @Get(':id/tracks/:trackId/stream')
  @RequirePermission('read')
  async streamTrack(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('trackId') trackId: string, @Res({ passthrough: true }) response: any) {
    const track = await this.tracksService.trackAsset(member, id, trackId);

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
    return new StreamableFile(await this.tracksService.storageStream(track.storageKey));
  }

  @Get(':id/tracks/:trackId/download')
  @RequirePermission('read')
  async downloadTrack(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('trackId') trackId: string, @Res({ passthrough: true }) response: any) {
    const track = await this.tracksService.trackAsset(member, id, trackId);
    const fileName = await this.tracksService.downloadFileName(member, id, trackId);

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
    return new StreamableFile(await this.tracksService.storageStream(track.storageKey));
  }

  @Post(':id/tracks')
  @RequirePermission('songs.manage')
  createTrack(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body(new ZodPipe(createSongTrackSchema)) body: CreateSongTrackData) {
    return this.tracksService.createTrack(member, id, body);
  }

  @Post(':id/tracks/upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @RequirePermission('songs.manage')
  uploadTrack(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body() body: Record<string, unknown>, @UploadedFile() file?: { buffer: Buffer; size: number; mimetype: string; originalname: string }) {
    return this.tracksService.uploadTrack(member, id, body ?? {}, file);
  }

  // PATCH .../tracks/reorder debe registrarse antes que PATCH .../tracks/:trackId
  // (mismo motivo que en links/reorder mas arriba).
  @Patch(':id/tracks/reorder')
  @RequirePermission('songs.manage')
  reorderTracks(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body(new ZodPipe(reorderSongTracksSchema)) body: ReorderSongTracksData) {
    return this.tracksService.reorderTracks(member, id, body);
  }

  @Patch(':id/tracks/:trackId')
  @RequirePermission('songs.manage')
  updateTrack(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('trackId') trackId: string, @Body(new ZodPipe(updateSongTrackSchema)) body: UpdateSongTrackData) {
    return this.tracksService.updateTrack(member, id, trackId, body);
  }

  @Delete(':id/tracks/:trackId')
  @RequirePermission('songs.manage')
  deleteTrack(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('trackId') trackId: string) {
    return this.tracksService.deleteTrack(member, id, trackId);
  }

  @Post(':id/tracks/:trackId/set-primary')
  @RequirePermission('songs.manage')
  setPrimaryTrack(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('trackId') trackId: string) {
    return this.tracksService.setPrimaryTrack(member, id, trackId);
  }

  @Post(':id/tracks/copy')
  @RequirePermission('songs.manage')
  copyTracks(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body(new ZodPipe(copySongTracksSchema)) body: CopySongTracksData) {
    return this.tracksService.copyTrackReferences(member, id, body);
  }
}
