import { createHash, randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { clean } from '../shared/object.utils';
import { SongActivityService } from './activity/song-activity.service';
import {
  AudioNotAllowedFileError,
  FileTooLargeError,
  mapMimeTypeToFileType,
  UnsupportedFileTypeError,
  validateSongFileUpload,
} from './files/song-file.utils';
import { SongsAccessService } from './songs-access.service';
import { normalizeSongFileResponse, sanitizeDownloadFileName } from './songs.presenter';
import { SongsRepository } from './songs.repository';
import {
  buildSongFileStorageSegments,
  listSongFileQuerySchema,
  reorderSongFilesSchema,
  songFileUploadBodySchema,
  updateSongFileSchema,
} from './songs.schemas';
import { TRACK_STORAGE, TrackStorageProvider } from './storage/track-storage.interface';

type UploadedSongFile = {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
};

@Injectable()
export class SongsFilesService {
  constructor(
    @Inject(SongsRepository) private readonly songsRepository: SongsRepository,
    @Inject(SongsAccessService) private readonly access: SongsAccessService,
    @Inject(TRACK_STORAGE) private readonly trackStorage: TrackStorageProvider,
    @Inject(SongActivityService) private readonly activity: SongActivityService,
  ) {}

  async files(userId: string, organizationId: string, songId: string, query: Record<string, unknown> = {}) {
    await this.access.assertSongInOrganization(userId, organizationId, songId);
    const parsed = listSongFileQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const versionId = parsed.data.versionId ? parsed.data.versionId : undefined;
    if (versionId) await this.access.assertVersionInSong(songId, versionId);
    const files = await this.songsRepository.listFiles(songId, { versionId, category: parsed.data.category });
    return files.map((file) => normalizeSongFileResponse(file));
  }

  async file(userId: string, organizationId: string, songId: string, songFileId: string) {
    await this.access.assertSongInOrganization(userId, organizationId, songId);
    const songFile = await this.access.assertSongFileInSong(songId, songFileId);
    return normalizeSongFileResponse(songFile);
  }

  async uploadSongFile(userId: string, organizationId: string, songId: string, input: Record<string, unknown>, file?: UploadedSongFile) {
    await this.access.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    if (!file) throw new BadRequestException('Archivo requerido');

    try {
      validateSongFileUpload(file);
    } catch (error) {
      if (error instanceof UnsupportedFileTypeError || error instanceof AudioNotAllowedFileError || error instanceof FileTooLargeError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    const parsed = songFileUploadBodySchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    const version = await this.access.assertVersionInSong(songId, parsed.data.versionId);
    const fileId = `file_${randomUUID().replace(/-/g, '')}`;
    const storage = await this.trackStorage.upload(
      file.buffer,
      buildSongFileStorageSegments(organizationId, songId, fileId, version?.id),
      file.originalname,
      file.mimetype,
    );

    try {
      const checksum = createHash('sha256').update(file.buffer).digest('hex');
      const sortOrder = await this.songsRepository.nextSongFileSortOrder(songId, version?.id || null);
      const created = await this.songsRepository.createSongFile({
        fileData: {
          id: fileId,
          organizationId,
          uploadedById: userId,
          name: file.originalname,
          originalName: file.originalname,
          type: mapMimeTypeToFileType(file.mimetype),
          mimeType: file.mimetype,
          sizeBytes: file.size,
          storageKey: storage.storageKey,
          checksum,
        },
        songFileData: {
          songId,
          versionId: version?.id,
          title: parsed.data.title || file.originalname.replace(/\.[^.]+$/, ''),
          description: parsed.data.description,
          category: parsed.data.category,
          isPrimary: parsed.data.isPrimary,
          sortOrder,
          active: true,
        },
      });
      await this.activity.recordBestEffort({
        songId,
        versionId: version?.id ?? null,
        organizationId,
        actorId: userId,
        action: 'FILE_ADDED',
        entityType: 'FILE',
        entityId: created.id,
        summary: `Subió el archivo "${created.title}"`,
        metadata: { category: created.category },
      });
      return normalizeSongFileResponse(created);
    } catch (error) {
      await this.trackStorage.delete(storage.storageKey);
      throw error;
    }
  }

  async updateSongFile(userId: string, organizationId: string, songId: string, songFileId: string, input: Record<string, unknown>) {
    await this.access.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    await this.access.assertSongFileInSong(songId, songFileId);
    const parsed = updateSongFileSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const version = parsed.data.versionId === undefined ? undefined : await this.access.assertVersionInSong(songId, parsed.data.versionId);

    const updated = await this.songsRepository.updateSongFile(songFileId, clean({
      versionId: parsed.data.versionId === undefined ? undefined : version?.id ?? null,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      isPrimary: parsed.data.isPrimary,
      active: parsed.data.active,
      sortOrder: parsed.data.sortOrder,
    }));
    return normalizeSongFileResponse(updated);
  }

  async deleteSongFile(userId: string, organizationId: string, songId: string, songFileId: string) {
    await this.access.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    const existing = await this.access.assertSongFileInSong(songId, songFileId);
    const deleted = await this.songsRepository.deleteSongFile(songFileId);

    const stillReferenced = await this.songsRepository.countFileReferences(deleted.fileId);
    const legacyLinked = Boolean(deleted.file.songId || deleted.file.eventId || deleted.file.setlistId);

    if (stillReferenced === 0 && !legacyLinked) {
      if (deleted.file.storageKey) await this.trackStorage.delete(deleted.file.storageKey);
      await this.songsRepository.deleteFile(deleted.fileId);
    }

    await this.activity.recordBestEffort({
      songId,
      versionId: existing.versionId,
      organizationId,
      actorId: userId,
      action: 'FILE_DELETED',
      entityType: 'FILE',
      entityId: songFileId,
      summary: `Eliminó el archivo "${existing.title || existing.file.name}"`,
    });

    return { ok: true };
  }

  async setPrimarySongFile(userId: string, organizationId: string, songId: string, songFileId: string) {
    await this.access.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    await this.access.assertSongFileInSong(songId, songFileId);
    const songFile = await this.songsRepository.setSongFilePrimary(songId, songFileId);
    await this.activity.recordBestEffort({
      songId,
      versionId: songFile.versionId,
      organizationId,
      actorId: userId,
      action: 'FILE_SET_PRIMARY',
      entityType: 'FILE',
      entityId: songFileId,
      summary: `Marcó "${songFile.title}" como archivo principal`,
    });
    return normalizeSongFileResponse(songFile);
  }

  async reorderSongFiles(userId: string, organizationId: string, songId: string, input: Record<string, unknown>) {
    await this.access.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    const parsed = reorderSongFilesSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const version = await this.access.assertVersionInSong(songId, parsed.data.versionId);
    const files = await this.songsRepository.reorderSongFiles(songId, version?.id || null, parsed.data.items);
    return files.map((file) => normalizeSongFileResponse(file));
  }

  async songFileAsset(userId: string, organizationId: string, songId: string, songFileId: string) {
    await this.access.assertSongInOrganization(userId, organizationId, songId);
    return this.songsRepository.songFileContext(songId, songFileId);
  }

  async downloadSongFileName(userId: string, organizationId: string, songId: string, songFileId: string) {
    const context = await this.songFileAsset(userId, organizationId, songId, songFileId);
    const extension = extname(context.file.originalName || context.file.name) || '';
    return `${sanitizeDownloadFileName(context.song.title)} - ${sanitizeDownloadFileName(context.title || context.file.name)}${extension.toLowerCase()}`;
  }

  async songFileStream(storageKey: string) {
    const exists = await this.trackStorage.exists(storageKey);
    if (!exists) throw new NotFoundException('Archivo no encontrado');
    return await this.trackStorage.createReadStream(storageKey);
  }
}
