import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SongsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  list(filters: {
    organizationId: string;
    search?: string;
    key?: string;
    bpmMin?: number;
    bpmMax?: number;
    tag?: string;
    status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
    favorite?: boolean;
  }) {
    return this.prisma.song.findMany({
      where: {
        organizationId: filters.organizationId,
        status: filters.status || { not: 'ARCHIVED' },
        ...(filters.search
          ? { OR: [{ title: { contains: filters.search, mode: 'insensitive' } }, { artist: { contains: filters.search, mode: 'insensitive' } }] }
          : {}),
        ...(filters.key ? { versions: { some: { key: filters.key } } } : {}),
        ...(filters.favorite === undefined ? {} : { isFavorite: filters.favorite }),
        ...(filters.tag ? { tags: { has: filters.tag } } : {}),
        ...(filters.bpmMin || filters.bpmMax ? { versions: { some: { bpm: { gte: filters.bpmMin, lte: filters.bpmMax } } } } : {}),
      },
      include: {
        versions: { where: { isDefault: true }, take: 1 },
      },
      orderBy: [{ isFavorite: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  findById(id: string) {
    return this.prisma.song.findUnique({
      where: { id },
      include: {
        versions: { orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }] },
        tracks: { orderBy: { sortOrder: 'asc' } },
        links: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }] },
        songNotes: { orderBy: { createdAt: 'desc' } },
        songFiles: { orderBy: { sortOrder: 'asc' }, include: { file: true } },
        files: { orderBy: { createdAt: 'desc' } },
        organization: true,
      },
    });
  }

  findByIdInOrganization(id: string, organizationId: string) {
    return this.prisma.song.findFirst({
      where: { id, organizationId },
      include: {
        versions: { orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }] },
        tracks: { orderBy: { sortOrder: 'asc' } },
        links: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }] },
        songNotes: { orderBy: { createdAt: 'desc' } },
        songFiles: { orderBy: { sortOrder: 'asc' }, include: { file: true } },
        files: { orderBy: { createdAt: 'desc' } },
        organization: true,
      },
    });
  }

  listVersions(songId: string) {
    return this.prisma.songVersion.findMany({
      where: { songId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  findVersion(songId: string, versionId: string) {
    return this.prisma.songVersion.findFirst({ where: { id: versionId, songId } });
  }

  listTracks(songId: string) {
    return this.prisma.songTrack.findMany({ where: { songId }, orderBy: { sortOrder: 'asc' } });
  }

  listLinks(songId: string) {
    return this.prisma.songLink.findMany({ where: { songId }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }] });
  }

  listFiles(songId: string) {
    return this.prisma.songFile.findMany({ where: { songId }, orderBy: { sortOrder: 'asc' }, include: { file: true } });
  }

  listNotes(songId: string) {
    return this.prisma.songNote.findMany({ where: { songId }, orderBy: { createdAt: 'desc' } });
  }

  createWithDefaultVersion(data: Prisma.SongCreateInput, version: Prisma.SongVersionUncheckedCreateWithoutSongInput) {
    return this.prisma.song.create({
      data: { ...data, versions: { create: { ...version, isDefault: true, name: version.name || 'Original' } } },
      include: { versions: { orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }] } },
    });
  }

  update(id: string, data: Prisma.SongUpdateInput) {
    return this.prisma.song.update({ where: { id }, data, include: { versions: { orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }] } } });
  }

  archive(id: string) {
    return this.prisma.song.update({ where: { id }, data: { status: 'ARCHIVED' } });
  }

  createVersion(data: Prisma.SongVersionUncheckedCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.songVersion.count({ where: { songId: data.songId } });
      const shouldBeDefault = data.isDefault || count === 0;
      if (shouldBeDefault) await tx.songVersion.updateMany({ where: { songId: data.songId }, data: { isDefault: false } });
      return tx.songVersion.create({ data: { ...data, isDefault: shouldBeDefault } });
    });
  }

  updateVersion(versionId: string, data: Prisma.SongVersionUpdateInput) {
    return this.prisma.$transaction(async (tx) => {
      if (data.isDefault === true) {
        const version = await tx.songVersion.findUniqueOrThrow({ where: { id: versionId } });
        await tx.songVersion.updateMany({ where: { songId: version.songId }, data: { isDefault: false } });
      }
      return tx.songVersion.update({ where: { id: versionId }, data });
    });
  }

  setDefaultVersion(songId: string, versionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const version = await tx.songVersion.findFirst({ where: { id: versionId, songId } });
      if (!version) throw new NotFoundException('Version no encontrada');
      await tx.songVersion.updateMany({ where: { songId }, data: { isDefault: false } });
      return tx.songVersion.update({ where: { id: versionId }, data: { isDefault: true } });
    });
  }

  deleteVersion(songId: string, versionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const versions = await tx.songVersion.findMany({ where: { songId }, orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }] });
      const target = versions.find((version) => version.id === versionId);
      if (!target) throw new NotFoundException('Version no encontrada');
      if (versions.length <= 1) throw new BadRequestException('No se puede eliminar la ultima version de una cancion');
      await tx.songVersion.delete({ where: { id: versionId } });
      if (target.isDefault) {
        const nextDefault = versions.find((version) => version.id !== versionId);
        if (nextDefault) await tx.songVersion.update({ where: { id: nextDefault.id }, data: { isDefault: true } });
      }
      return { ok: true };
    });
  }

  createLink(data: Prisma.SongLinkUncheckedCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      if (data.isPrimary) await tx.songLink.updateMany({ where: { songId: data.songId }, data: { isPrimary: false } });
      return tx.songLink.create({ data });
    });
  }

  updateLink(linkId: string, data: Prisma.SongLinkUpdateInput) {
    return this.prisma.$transaction(async (tx) => {
      if (data.isPrimary === true) {
        const link = await tx.songLink.findUniqueOrThrow({ where: { id: linkId } });
        await tx.songLink.updateMany({ where: { songId: link.songId }, data: { isPrimary: false } });
      }
      return tx.songLink.update({ where: { id: linkId }, data });
    });
  }

  createNote(data: Prisma.SongNoteUncheckedCreateInput) {
    return this.prisma.songNote.create({ data });
  }

  updateNote(noteId: string, data: Prisma.SongNoteUpdateInput) {
    return this.prisma.songNote.update({ where: { id: noteId }, data });
  }

  createTrack(data: Prisma.SongTrackUncheckedCreateInput) {
    return this.prisma.songTrack.create({ data });
  }

  updateTrack(trackId: string, data: Prisma.SongTrackUpdateInput) {
    return this.prisma.$transaction(async (tx) => {
      if (data.isPrimary === true) {
        const track = await tx.songTrack.findUniqueOrThrow({ where: { id: trackId } });
        await tx.songTrack.updateMany({ where: { songId: track.songId }, data: { isPrimary: false } });
      }
      return tx.songTrack.update({ where: { id: trackId }, data });
    });
  }
}
