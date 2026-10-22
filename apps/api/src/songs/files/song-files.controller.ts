import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import {
  reorderSongFilesSchema,
  songFileListQuerySchema,
  updateSongFileSchema,
  type ReorderSongFilesData,
  type SongFileListQueryData,
  type UpdateSongFileData,
} from '@harmonyhub/contracts';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentMembership, OrgMember } from '../../permissions/current-membership.decorator';
import { PermissionsGuard } from '../../permissions/permissions.guard';
import { RequirePermission } from '../../permissions/require-permission.decorator';
import { ZodPipe } from '../../shared/zod.pipe';
import { SongFilesService } from './song-files.service';

/** Archivos de una cancion (partituras, PDFs...): listar, ver, descargar, subir y ordenar. Mismas rutas que antes (api/songs/:id/...). */
@Controller('api/songs')
@UseGuards(AuthGuard, PermissionsGuard)
export class SongFilesController {
  constructor(@Inject(SongFilesService) private readonly filesService: SongFilesService) {}

  @Get(':id/files')
  @RequirePermission('read')
  files(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Query(new ZodPipe(songFileListQuerySchema)) query: SongFileListQueryData) {
    return this.filesService.files(member, id, query);
  }

  @Get(':id/files/:songFileId')
  @RequirePermission('read')
  file(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('songFileId') songFileId: string) {
    return this.filesService.file(member, id, songFileId);
  }

  @Get(':id/files/:songFileId/stream')
  @RequirePermission('read')
  async streamSongFile(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('songFileId') songFileId: string, @Res({ passthrough: true }) response: any) {
    const context = await this.filesService.songFileAsset(member, id, songFileId);
    if (!context.file.storageKey) {
      response.status(404);
      return { message: 'Archivo no disponible' };
    }

    response.setHeader('Content-Type', context.file.mimeType || 'application/octet-stream');
    if (context.file.sizeBytes) response.setHeader('Content-Length', String(context.file.sizeBytes));
    return new StreamableFile(await this.filesService.songFileStream(context.file.storageKey));
  }

  @Get(':id/files/:songFileId/download')
  @RequirePermission('read')
  async downloadSongFile(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('songFileId') songFileId: string, @Res({ passthrough: true }) response: any) {
    const context = await this.filesService.songFileAsset(member, id, songFileId);
    if (!context.file.storageKey) {
      response.status(404);
      return { message: 'Archivo no disponible' };
    }

    const fileName = await this.filesService.downloadSongFileName(member, id, songFileId);
    response.setHeader('Content-Type', context.file.mimeType || 'application/octet-stream');
    response.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    if (context.file.sizeBytes) response.setHeader('Content-Length', String(context.file.sizeBytes));
    return new StreamableFile(await this.filesService.songFileStream(context.file.storageKey));
  }

  @Post(':id/files/upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @RequirePermission('songs.manage')
  uploadSongFile(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body() body: Record<string, unknown>, @UploadedFile() file?: { buffer: Buffer; size: number; mimetype: string; originalname: string }) {
    return this.filesService.uploadSongFile(member, id, body ?? {}, file);
  }

  // PATCH .../files/reorder debe registrarse antes que PATCH .../files/:songFileId
  // (mismo motivo que en links/reorder y tracks/reorder mas arriba).
  @Patch(':id/files/reorder')
  @RequirePermission('songs.manage')
  reorderSongFiles(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body(new ZodPipe(reorderSongFilesSchema)) body: ReorderSongFilesData) {
    return this.filesService.reorderSongFiles(member, id, body);
  }

  @Patch(':id/files/:songFileId')
  @RequirePermission('songs.manage')
  updateSongFile(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('songFileId') songFileId: string, @Body(new ZodPipe(updateSongFileSchema)) body: UpdateSongFileData) {
    return this.filesService.updateSongFile(member, id, songFileId, body);
  }

  @Delete(':id/files/:songFileId')
  @RequirePermission('songs.manage')
  deleteSongFile(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('songFileId') songFileId: string) {
    return this.filesService.deleteSongFile(member, id, songFileId);
  }

  @Post(':id/files/:songFileId/set-primary')
  @RequirePermission('songs.manage')
  setPrimarySongFile(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('songFileId') songFileId: string) {
    return this.filesService.setPrimarySongFile(member, id, songFileId);
  }
}
