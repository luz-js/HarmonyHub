import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SongFileCategory } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { sameTrackContext, songFileOrderBy, songFileInclude } from '../songs.queries';

/** Archivos de una cancion (partituras, PDFs, imagenes...) y la pagina Archivos de la organizacion. */
@Injectable()
export class SongFilesRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Archivos de todas las canciones (no archivadas) de la organizacion, los mas recientes primero. */
  listOrganizationFiles(organizationId: string, options: { search?: string; category?: Prisma.SongFileWhereInput['category']; take: number }) {
    const search = options.search?.trim();
    const contains = (value: string) => ({ contains: value, mode: 'insensitive' as const });
    return this.prisma.songFile.findMany({
      where: {
        song: { organizationId, status: { not: 'ARCHIVED' } },
        ...(options.category ? { category: options.category } : {}),
        ...(search
          ? {
              OR: [
                { title: contains(search) },
                { file: { name: contains(search) } },
                { file: { originalName: contains(search) } },
                { song: { title: contains(search) } },
                { song: { artist: contains(search) } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: options.take,
      include: { ...songFileInclude, song: { select: { id: true, title: true, artist: true } } },
    });
  }

  listFiles(songId: string, options?: { versionId?: string | null; category?: Prisma.SongFileWhereInput['category'] }) {
    const versionId = options?.versionId;
    return this.prisma.songFile.findMany({
      where: {
        songId,
        ...(options?.category ? { category: options.category } : {}),
        ...(versionId === undefined
          ? {}
          : versionId === null
            ? { versionId: null }
            : { OR: [{ versionId: null }, { versionId }] }),
      },
      orderBy: songFileOrderBy,
      include: songFileInclude,
    });
  }

  findSongFile(songId: string, songFileId: string) {
    return this.prisma.songFile.findFirst({ where: { id: songFileId, songId }, include: songFileInclude });
  }

  nextSongFileSortOrder(songId: string, versionId: string | null) {
    return this.prisma.songFile.count({ where: { songId, ...sameTrackContext(versionId) } });
  }

  countFileReferences(fileId: string, excludeSongFileId?: string) {
    return this.prisma.songFile.count({ where: { fileId, ...(excludeSongFileId ? { NOT: { id: excludeSongFileId } } : {}) } });
  }

  createSongFile(params: {
    fileData: Prisma.FileUncheckedCreateInput;
    songFileData: Omit<Prisma.SongFileUncheckedCreateInput, 'fileId'>;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const file = await tx.file.create({ data: params.fileData });

      if (params.songFileData.isPrimary) {
        await tx.songFile.updateMany({
          where: {
            songId: params.songFileData.songId,
            ...sameTrackContext((params.songFileData.versionId as string | null) ?? null),
            category: params.songFileData.category,
          },
          data: { isPrimary: false },
        });
      }

      return tx.songFile.create({ data: { ...params.songFileData, fileId: file.id }, include: songFileInclude });
    });
  }

  updateSongFile(songFileId: string, data: Prisma.SongFileUncheckedUpdateInput) {
    return this.prisma.$transaction(async (tx) => {
      const songFile = await tx.songFile.findUniqueOrThrow({ where: { id: songFileId } });
      const nextVersionId = data.versionId === undefined ? songFile.versionId : (data.versionId as string | null);
      const nextCategory = data.category === undefined ? songFile.category : (data.category as SongFileCategory);
      const nextIsPrimary = data.isPrimary === undefined ? songFile.isPrimary : Boolean(data.isPrimary);

      if (nextIsPrimary) {
        await tx.songFile.updateMany({
          where: { songId: songFile.songId, ...sameTrackContext(nextVersionId ?? null), category: nextCategory, NOT: { id: songFileId } },
          data: { isPrimary: false },
        });
      }

      return tx.songFile.update({ where: { id: songFileId }, data, include: songFileInclude });
    });
  }

  deleteSongFile(songFileId: string) {
    return this.prisma.songFile.delete({
      where: { id: songFileId },
      select: {
        id: true,
        songId: true,
        fileId: true,
        file: { select: { id: true, storageKey: true, songId: true, eventId: true, setlistId: true } },
      },
    });
  }

  deleteFile(fileId: string) {
    return this.prisma.file.delete({ where: { id: fileId } });
  }

  setSongFilePrimary(songId: string, songFileId: string) {
    return this.prisma.$transaction(async (tx) => {
      const songFile = await tx.songFile.findFirst({ where: { id: songFileId, songId }, select: { id: true, versionId: true, category: true } });
      if (!songFile) throw new NotFoundException('Archivo no encontrado');

      await tx.songFile.updateMany({
        where: { songId, ...sameTrackContext(songFile.versionId ?? null), category: songFile.category },
        data: { isPrimary: false },
      });

      return tx.songFile.update({ where: { id: songFileId }, data: { isPrimary: true }, include: songFileInclude });
    });
  }

  reorderSongFiles(songId: string, versionId: string | null, items: Array<{ id: string; sortOrder: number }>) {
    return this.prisma.$transaction(async (tx) => {
      const files = await tx.songFile.findMany({
        where: { songId, ...sameTrackContext(versionId) },
        select: { id: true },
      });

      const fileIds = new Set(files.map((file) => file.id));
      if (items.some((item) => !fileIds.has(item.id))) {
        throw new BadRequestException('Uno o mas archivos no pertenecen a este contexto');
      }

      const normalized = [...items].sort((a, b) => a.sortOrder - b.sortOrder).map((item, index) => ({ ...item, sortOrder: index }));
      await Promise.all(normalized.map((item) => tx.songFile.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })));

      return tx.songFile.findMany({
        where: { songId, ...sameTrackContext(versionId) },
        orderBy: songFileOrderBy,
        include: songFileInclude,
      });
    });
  }

  async songFileContext(songId: string, songFileId: string) {
    const songFile = await this.prisma.songFile.findFirst({
      where: { id: songFileId, songId },
      select: {
        id: true,
        songId: true,
        title: true,
        file: {
          select: {
            id: true,
            name: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            storageKey: true,
            url: true,
          },
        },
        song: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!songFile) throw new NotFoundException('Archivo no encontrado');
    return songFile;
  }
}
