import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TrackProvider } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { trackOrderBy, trackSelect, sameTrackContext } from '../songs.queries';

/** Pistas de audio de una cancion (subidas o externas). */
@Injectable()
export class SongTracksRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listTracks(songId: string, options?: { versionId?: string | null; includeGeneral?: boolean }) {
    const versionId = options?.versionId;
    const includeGeneral = options?.includeGeneral ?? true;
    return this.prisma.songTrack.findMany({
      where: {
        songId,
        ...(versionId === undefined
          ? {}
          : versionId === null
            ? { versionId: null }
            : includeGeneral
              ? { OR: [{ versionId: null }, { versionId }] }
              : { versionId }),
      },
      orderBy: trackOrderBy,
      select: trackSelect,
    });
  }

  findTrack(songId: string, trackId: string) {
    return this.prisma.songTrack.findFirst({
      where: { id: trackId, songId },
      select: {
        ...trackSelect,
        uploadedById: true,
        storageKey: true,
      },
    });
  }

  createTrack(data: Prisma.SongTrackUncheckedCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      if (data.isPrimary) {
        await tx.songTrack.updateMany({
          where: { songId: data.songId, ...sameTrackContext(data.versionId ?? null) },
          data: { isPrimary: false },
        });
      }
      return tx.songTrack.create({ data, select: trackSelect });
    });
  }

  updateTrack(trackId: string, data: Prisma.SongTrackUncheckedUpdateInput) {
    return this.prisma.$transaction(async (tx) => {
      const track = await tx.songTrack.findUniqueOrThrow({ where: { id: trackId } });
      const nextVersionId = data.versionId === undefined ? track.versionId : (data.versionId as string | null);
      const nextIsPrimary = data.isPrimary === undefined ? track.isPrimary : Boolean(data.isPrimary);

      if (nextIsPrimary) {
        await tx.songTrack.updateMany({
          where: { songId: track.songId, ...sameTrackContext(nextVersionId ?? null), NOT: { id: trackId } },
          data: { isPrimary: false },
        });
      }

      return tx.songTrack.update({ where: { id: trackId }, data, select: trackSelect });
    });
  }

  deleteTrack(trackId: string) {
    return this.prisma.songTrack.delete({
      where: { id: trackId },
      select: {
        id: true,
        songId: true,
        versionId: true,
        name: true,
        provider: true,
        storageKey: true,
        url: true,
      },
    });
  }

  reorderTracks(songId: string, versionId: string | null, items: Array<{ id: string; sortOrder: number }>) {
    return this.prisma.$transaction(async (tx) => {
      const tracks = await tx.songTrack.findMany({
        where: { songId, ...sameTrackContext(versionId) },
        select: { id: true },
        orderBy: trackOrderBy,
      });

      const trackIds = new Set(tracks.map((track) => track.id));
      if (items.some((item) => !trackIds.has(item.id))) {
        throw new BadRequestException('Una o mas pistas no pertenecen a este contexto');
      }

      const normalized = [...items].sort((a, b) => a.sortOrder - b.sortOrder).map((item, index) => ({ ...item, sortOrder: index }));
      await Promise.all(normalized.map((item) => tx.songTrack.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })));

      return tx.songTrack.findMany({
        where: { songId, ...sameTrackContext(versionId) },
        orderBy: trackOrderBy,
        select: trackSelect,
      });
    });
  }

  setTrackPrimary(songId: string, trackId: string) {
    return this.prisma.$transaction(async (tx) => {
      const track = await tx.songTrack.findFirst({ where: { id: trackId, songId }, select: { id: true, songId: true, versionId: true } });
      if (!track) throw new NotFoundException('Pista no encontrada');

      await tx.songTrack.updateMany({
        where: { songId, ...sameTrackContext(track.versionId ?? null) },
        data: { isPrimary: false },
      });

      return tx.songTrack.update({
        where: { id: trackId },
        data: { isPrimary: true },
        select: trackSelect,
      });
    });
  }

  nextTrackSortOrder(songId: string, versionId: string | null) {
    return this.prisma.songTrack.count({ where: { songId, ...sameTrackContext(versionId) } });
  }

  countTracksByStorageKey(storageKey: string, excludeTrackId?: string) {
    return this.prisma.songTrack.count({
      where: { storageKey, ...(excludeTrackId ? { NOT: { id: excludeTrackId } } : {}) },
    });
  }

  /**
   * Copia las asociaciones de pistas de una version a otra dentro de la misma
   * cancion como REFERENCIAS logicas: se crean filas nuevas que reutilizan la
   * misma `storageKey`/URL (no se duplica el binario). Las copias nunca quedan
   * como principal para no romper el invariante de "una principal por contexto".
   */
  copyTrackReferences(params: {
    songId: string;
    sourceVersionId: string;
    targetVersionId: string;
    uploadedById: string | null;
    buildInternalUrl: (trackId: string) => string;
    makeTrackId: () => string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const sources = await tx.songTrack.findMany({
        where: { songId: params.songId, versionId: params.sourceVersionId },
        orderBy: trackOrderBy,
        select: {
          name: true,
          type: true,
          instrument: true,
          mimeType: true,
          sizeBytes: true,
          durationSec: true,
          originalFileName: true,
          storageKey: true,
          url: true,
          provider: true,
          volumeDefault: true,
          panDefault: true,
          active: true,
        },
      });

      if (sources.length === 0) return [];

      const base = await tx.songTrack.count({ where: { songId: params.songId, versionId: params.targetVersionId } });
      const created: Prisma.SongTrackGetPayload<{ select: typeof trackSelect }>[] = [];

      for (let index = 0; index < sources.length; index += 1) {
        const source = sources[index];
        const id = params.makeTrackId();
        const isExternal = source.provider === 'EXTERNAL_URL' || source.provider === 'OTHER';
        const row = await tx.songTrack.create({
          data: {
            id,
            songId: params.songId,
            versionId: params.targetVersionId,
            uploadedById: params.uploadedById,
            name: source.name,
            type: source.type,
            instrument: source.instrument,
            mimeType: source.mimeType,
            sizeBytes: source.sizeBytes,
            durationSec: source.durationSec,
            originalFileName: source.originalFileName,
            storageKey: source.storageKey,
            url: isExternal ? source.url : params.buildInternalUrl(id),
            provider: source.provider,
            volumeDefault: source.volumeDefault,
            panDefault: source.panDefault,
            isPrimary: false,
            sortOrder: base + index,
            active: source.active,
          },
          select: trackSelect,
        });
        created.push(row);
      }

      return created;
    });
  }

  async songTrackFileContext(songId: string, trackId: string) {
    const track = await this.prisma.songTrack.findFirst({
      where: { id: trackId, songId },
      select: {
        id: true,
        songId: true,
        name: true,
        originalFileName: true,
        mimeType: true,
        provider: true,
        storageKey: true,
        sizeBytes: true,
        url: true,
        versionId: true,
        song: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!track) throw new NotFoundException('Pista no encontrada');
    return track;
  }

  isExternalProvider(provider: TrackProvider) {
    return provider === 'EXTERNAL_URL' || provider === 'OTHER';
  }
}
