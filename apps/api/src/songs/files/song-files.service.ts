import { createHash, randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  songFileUploadBodySchema,
  type OrganizationFilesQueryData,
  type ReorderSongFilesData,
  type SongFileListQueryData,
  type UpdateSongFileData,
} from '@harmonyhub/contracts';
import { parseOrBadRequest } from '../../shared/zod.pipe';
import { clean } from '../../shared/object.utils';
import { SongActivityService } from '../activity/song-activity.service';
import {
  AudioNotAllowedFileError,
  FileTooLargeError,
  mapMimeTypeToFileType,
  UnsupportedFileTypeError,
  validateSongFileUpload,
} from './song-file.utils';
import { SongsAccessService } from '../songs-access.service';
import { normalizeSongFileResponse, sanitizeDownloadFileName } from '../songs.presenter';
import { SongFilesRepository } from './song-files.repository';
import { buildSongFileStorageSegments } from '../songs.schemas';
import { TRACK_STORAGE, TrackStorageProvider } from '../storage/track-storage.interface';
import type { OrgMember } from '../../permissions/current-membership.decorator';

type UploadedSongFile = {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
};

@Injectable()
export class SongFilesService {
  constructor(
    @Inject(SongFilesRepository) private readonly filesRepository: SongFilesRepository,
    @Inject(SongsAccessService) private readonly access: SongsAccessService,
    @Inject(TRACK_STORAGE) private readonly trackStorage: TrackStorageProvider,
    @Inject(SongActivityService) private readonly activity: SongActivityService,
  ) {}

  /** Pagina Archivos: todos los archivos de las canciones de la organizacion, con su cancion. */
  async organizationFiles(member: OrgMember, query: OrganizationFilesQueryData) {
    const files = await this.filesRepository.listOrganizationFiles(member.organizationId, { search: query.search, category: query.category, take: query.limit });
    return { items: files.map((file) => ({ ...normalizeSongFileResponse(file), song: file.song })) };
  }

  async files(member: OrgMember, songId: string, query: SongFileListQueryData) {
    const { organizationId } = member;
    await this.access.assertSongInOrganization(organizationId, songId);
    const versionId = query.versionId ? query.versionId : undefined;
    if (versionId) await this.access.assertVersionInSong(songId, versionId);
    const files = await this.filesRepository.listFiles(songId, { versionId, category: query.category });
    return files.map((file) => normalizeSongFileResponse(file));
  }

  async file(member: OrgMember, songId: string, songFileId: string) {
    const { organizationId } = member;
    await this.access.assertSongInOrganization(organizationId, songId);
    const songFile = await this.access.assertSongFileInSong(songId, songFileId);
    return normalizeSongFileResponse(songFile);
  }

  async uploadSongFile(member: OrgMember, songId: string, input: Record<string, unknown>, file?: UploadedSongFile) {
    const { userId, organizationId } = member;
    await this.access.assertSongInOrganization(organizationId, songId);
    if (!file) throw new BadRequestException('Archivo requerido');

    try {
      validateSongFileUpload(file);
    } catch (error) {
      if (error instanceof UnsupportedFileTypeError || error instanceof AudioNotAllowedFileError || error instanceof FileTooLargeError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    // Se valida aqui y no con ZodPipe: es un formulario multipart y primero se revisa el archivo.
    const data = parseOrBadRequest(songFileUploadBodySchema, input);

    const version = await this.access.assertVersionInSong(songId, data.versionId);
    const fileId = `file_${randomUUID().replace(/-/g, '')}`;
    const storage = await this.trackStorage.upload(
      file.buffer,
      buildSongFileStorageSegments(organizationId, songId, fileId, version?.id),
      file.originalname,
      file.mimetype,
    );

    try {
      const checksum = createHash('sha256').update(file.buffer).digest('hex');
      const sortOrder = await this.filesRepository.nextSongFileSortOrder(songId, version?.id || null);
      const created = await this.filesRepository.createSongFile({
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
          title: data.title || file.originalname.replace(/\.[^.]+$/, ''),
          description: data.description,
          category: data.category,
          isPrimary: data.isPrimary,
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

  async updateSongFile(member: OrgMember, songId: string, songFileId: string, data: UpdateSongFileData) {
    const { organizationId } = member;
    await this.access.assertSongInOrganization(organizationId, songId);
    await this.access.assertSongFileInSong(songId, songFileId);
    const version = data.versionId === undefined ? undefined : await this.access.assertVersionInSong(songId, data.versionId);

    const updated = await this.filesRepository.updateSongFile(songFileId, clean({
      versionId: data.versionId === undefined ? undefined : version?.id ?? null,
      title: data.title,
      description: data.description,
      category: data.category,
      isPrimary: data.isPrimary,
      active: data.active,
      sortOrder: data.sortOrder,
    }));
    return normalizeSongFileResponse(updated);
  }

  async deleteSongFile(member: OrgMember, songId: string, songFileId: string) {
    const { userId, organizationId } = member;
    await this.access.assertSongInOrganization(organizationId, songId);
    const existing = await this.access.assertSongFileInSong(songId, songFileId);
    const deleted = await this.filesRepository.deleteSongFile(songFileId);

    const stillReferenced = await this.filesRepository.countFileReferences(deleted.fileId);
    const legacyLinked = Boolean(deleted.file.songId || deleted.file.eventId || deleted.file.setlistId);

    if (stillReferenced === 0 && !legacyLinked) {
      if (deleted.file.storageKey) await this.trackStorage.delete(deleted.file.storageKey);
      await this.filesRepository.deleteFile(deleted.fileId);
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

  async setPrimarySongFile(member: OrgMember, songId: string, songFileId: string) {
    const { userId, organizationId } = member;
    await this.access.assertSongInOrganization(organizationId, songId);
    await this.access.assertSongFileInSong(songId, songFileId);
    const songFile = await this.filesRepository.setSongFilePrimary(songId, songFileId);
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

  async reorderSongFiles(member: OrgMember, songId: string, data: ReorderSongFilesData) {
    const { organizationId } = member;
    await this.access.assertSongInOrganization(organizationId, songId);
    const version = await this.access.assertVersionInSong(songId, data.versionId);
    const files = await this.filesRepository.reorderSongFiles(songId, version?.id || null, data.items);
    return files.map((file) => normalizeSongFileResponse(file));
  }

  async songFileAsset(member: OrgMember, songId: string, songFileId: string) {
    const { organizationId } = member;
    await this.access.assertSongInOrganization(organizationId, songId);
    return this.filesRepository.songFileContext(songId, songFileId);
  }

  async downloadSongFileName(member: OrgMember, songId: string, songFileId: string) {
    const context = await this.songFileAsset(member, songId, songFileId);
    const extension = extname(context.file.originalName || context.file.name) || '';
    return `${sanitizeDownloadFileName(context.song.title)} - ${sanitizeDownloadFileName(context.title || context.file.name)}${extension.toLowerCase()}`;
  }

  async songFileStream(storageKey: string) {
    const exists = await this.trackStorage.exists(storageKey);
    if (!exists) throw new NotFoundException('Archivo no encontrado');
    return await this.trackStorage.createReadStream(storageKey);
  }
}
