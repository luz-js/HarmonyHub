import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SongFileCategory, TrackProvider } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const trackOrderBy: Prisma.SongTrackOrderByWithRelationInput[] = [
  { isPrimary: 'desc' },
  { sortOrder: 'asc' },
  { createdAt: 'asc' },
];

const trackSelect = {
  id: true,
  songId: true,
  versionId: true,
  name: true,
  type: true,
  instrument: true,
  mimeType: true,
  sizeBytes: true,
  durationSec: true,
  originalFileName: true,
  url: true,
  provider: true,
  volumeDefault: true,
  panDefault: true,
  isPrimary: true,
  sortOrder: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  version: {
    select: {
      id: true,
      name: true,
      key: true,
      isDefault: true,
    },
  },
  uploadedBy: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.SongTrackSelect;

function sameTrackContext(versionId: string | null) {
  return versionId ? { versionId } : { versionId: null };
}

const linkOrderBy: Prisma.SongLinkOrderByWithRelationInput[] = [
  { isPrimary: 'desc' },
  { sortOrder: 'asc' },
  { createdAt: 'asc' },
];

const linkInclude = {
  version: { select: { id: true, name: true, key: true, isDefault: true } },
  createdBy: { select: { id: true, name: true, avatarUrl: true } },
} satisfies Prisma.SongLinkInclude;

const songFileOrderBy: Prisma.SongFileOrderByWithRelationInput[] = [
  { isPrimary: 'desc' },
  { sortOrder: 'asc' },
  { createdAt: 'asc' },
];

// Select deliberadamente sin storageKey/checksum/organizationId: esta forma se
// usa tanto en respuestas normalizadas como en el include anidado de detail(),
// que no vuelve a pasar por el normalizador. storageKey solo se lee en las
// consultas internas dedicadas (songFileContext) para servir stream/download.
const songFileInclude = {
  version: { select: { id: true, name: true, key: true, isDefault: true } },
  file: {
    select: {
      id: true,
      name: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      url: true,
      createdAt: true,
      uploadedBy: { select: { id: true, name: true, avatarUrl: true } },
    },
  },
} satisfies Prisma.SongFileInclude;

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

  listVersions(songId: string) {
    return this.prisma.songVersion.findMany({
      where: { songId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
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

  listLinks(songId: string, options?: { versionId?: string | null }) {
    const versionId = options?.versionId;
    return this.prisma.songLink.findMany({
      where: {
        songId,
        ...(versionId === undefined
          ? {}
          : versionId === null
            ? { versionId: null }
            : { OR: [{ versionId: null }, { versionId }] }),
      },
      orderBy: linkOrderBy,
      include: linkInclude,
    });
  }

  findLink(songId: string, linkId: string) {
    return this.prisma.songLink.findFirst({ where: { id: linkId, songId }, include: linkInclude });
  }

  nextLinkSortOrder(songId: string, versionId: string | null) {
    return this.prisma.songLink.count({ where: { songId, ...sameTrackContext(versionId) } });
  }

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
      if (data.isPrimary) {
        await tx.songLink.updateMany({
          where: { songId: data.songId, ...sameTrackContext(data.versionId ?? null) },
          data: { isPrimary: false },
        });
      }
      return tx.songLink.create({ data, include: linkInclude });
    });
  }

  updateLink(linkId: string, data: Prisma.SongLinkUncheckedUpdateInput) {
    return this.prisma.$transaction(async (tx) => {
      const link = await tx.songLink.findUniqueOrThrow({ where: { id: linkId } });
      const nextVersionId = data.versionId === undefined ? link.versionId : (data.versionId as string | null);
      const nextIsPrimary = data.isPrimary === undefined ? link.isPrimary : Boolean(data.isPrimary);

      if (nextIsPrimary) {
        await tx.songLink.updateMany({
          where: { songId: link.songId, ...sameTrackContext(nextVersionId ?? null), NOT: { id: linkId } },
          data: { isPrimary: false },
        });
      }

      return tx.songLink.update({ where: { id: linkId }, data, include: linkInclude });
    });
  }

  deleteLink(linkId: string) {
    return this.prisma.songLink.delete({ where: { id: linkId } });
  }

  setLinkPrimary(songId: string, linkId: string) {
    return this.prisma.$transaction(async (tx) => {
      const link = await tx.songLink.findFirst({ where: { id: linkId, songId }, select: { id: true, versionId: true } });
      if (!link) throw new NotFoundException('Enlace no encontrado');

      await tx.songLink.updateMany({
        where: { songId, ...sameTrackContext(link.versionId ?? null) },
        data: { isPrimary: false },
      });

      return tx.songLink.update({ where: { id: linkId }, data: { isPrimary: true }, include: linkInclude });
    });
  }

  reorderLinks(songId: string, versionId: string | null, items: Array<{ id: string; sortOrder: number }>) {
    return this.prisma.$transaction(async (tx) => {
      const links = await tx.songLink.findMany({
        where: { songId, ...sameTrackContext(versionId) },
        select: { id: true },
      });

      const linkIds = new Set(links.map((link) => link.id));
      if (items.some((item) => !linkIds.has(item.id))) {
        throw new BadRequestException('Uno o mas enlaces no pertenecen a este contexto');
      }

      const normalized = [...items].sort((a, b) => a.sortOrder - b.sortOrder).map((item, index) => ({ ...item, sortOrder: index }));
      await Promise.all(normalized.map((item) => tx.songLink.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })));

      return tx.songLink.findMany({
        where: { songId, ...sameTrackContext(versionId) },
        orderBy: linkOrderBy,
        include: linkInclude,
      });
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
