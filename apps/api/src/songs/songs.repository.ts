import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { trackOrderBy, trackSelect, songFileOrderBy, songFileInclude } from './songs.queries';

/** Canciones: listado, detalle y las busquedas que usan los demas submodulos para comprobar acceso. */
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
      // DTO resumen: nunca cargar contentJson/structureJson/lyrics/chords en el listado.
      // Solo se selecciona lo que la tarjeta de la lista realmente necesita.
      select: {
        id: true,
        organizationId: true,
        title: true,
        artist: true,
        originalKey: true,
        currentKey: true,
        bpm: true,
        durationSec: true,
        album: true,
        year: true,
        genre: true,
        timeSignature: true,
        language: true,
        isFavorite: true,
        coverUrl: true,
        tags: true,
        status: true,
        updatedAt: true,
        versions: {
          where: { isDefault: true },
          take: 1,
          select: { id: true, name: true, key: true, bpm: true, durationSec: true },
        },
        _count: { select: { versions: true, tracks: true, songFiles: true } },
      },
      orderBy: [{ isFavorite: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  findById(id: string) {
    return this.prisma.song.findUnique({
      where: { id },
      include: {
        versions: { orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }] },
        tracks: { orderBy: trackOrderBy, select: trackSelect },
        links: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }] },
        songFiles: { orderBy: songFileOrderBy, include: songFileInclude },
        files: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, name: true, originalName: true, type: true, mimeType: true, sizeBytes: true, createdAt: true },
        },
        organization: true,
      },
    });
  }

  findByIdInOrganization(id: string, organizationId: string) {
    return this.prisma.song.findFirst({
      where: { id, organizationId },
      include: {
        versions: { orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }] },
        tracks: { orderBy: trackOrderBy, select: trackSelect },
        links: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }] },
        songFiles: { orderBy: songFileOrderBy, include: songFileInclude },
        files: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, name: true, originalName: true, type: true, mimeType: true, sizeBytes: true, createdAt: true },
        },
        organization: true,
      },
    });
  }

  findSongSummaryInOrganization(songId: string, organizationId: string) {
    return this.prisma.song.findFirst({
      where: { id: songId, organizationId },
      select: {
        id: true,
        title: true,
        organizationId: true,
      },
    });
  }

  findVersion(songId: string, versionId: string) {
    return this.prisma.songVersion.findFirst({
      where: { id: versionId, songId },
      select: {
        id: true,
        songId: true,
        name: true,
        key: true,
        bpm: true,
        durationSec: true,
        isDefault: true,
      },
    });
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
}
