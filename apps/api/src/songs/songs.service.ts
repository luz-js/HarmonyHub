import { createHash, randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SongFileCategory, SongTrackType, TrackProvider } from '@prisma/client';
import { z } from 'zod';
import { PermissionsService } from '../permissions/permissions.service';
import {
  AudioNotAllowedFileError,
  FileTooLargeError,
  mapMimeTypeToFileType,
  UnsupportedFileTypeError,
  validateSongFileUpload,
} from './files/song-file.utils';
import { InvalidLinkUrlError, resolveSongLink } from './links/song-link.utils';
import { clean } from '../shared/object.utils';
import { SongActivityService } from './activity/song-activity.service';
import { SongRevisionsService } from './history/song-revisions.service';
import { SongsRepository } from './songs.repository';
import { TRACK_STORAGE, TrackStorageProvider } from './storage/track-storage.interface';

const ALLOWED_AUDIO_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/mp4',
  'audio/aac',
  'audio/flac',
  'audio/webm',
]);

const ALLOWED_AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm']);

const sectionLineSchema = z.object({
  id: z.string().min(1),
  order: z.coerce.number().int().nonnegative(),
  chords: z.string().optional().default(''),
  lyrics: z.string().optional().default(''),
});

const contentSchema = z.object({
  version: z.literal(1).default(1),
  sections: z.array(z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    name: z.string().min(1),
    order: z.coerce.number().int().nonnegative(),
    chords: z.array(z.string()).optional(),
    lyrics: z.string().optional(),
    lines: z.array(sectionLineSchema).default([]),
    notes: z.string().optional(),
    collapsed: z.boolean().optional(),
  })).default([]),
});

const keySchema = z.string().regex(/^[A-G](#|b)?(m| minor| major| menor| mayor)?$/i, 'Tonalidad invalida');

const songSchema = z.object({
  title: z.string().min(1, 'Titulo requerido'),
  artist: z.string().min(1, 'Artista requerido'),
  album: z.string().optional().nullable(),
  year: z.coerce.number().int().positive().optional().nullable(),
  genre: z.string().optional().nullable(),
  originalKey: keySchema.default('C'),
  currentKey: keySchema.default('C'),
  bpm: z.coerce.number().int().positive().max(320).optional().nullable(),
  durationSec: z.coerce.number().int().positive().optional().nullable(),
  timeSignature: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  isFavorite: z.boolean().default(false),
  coverUrl: z.string().optional().nullable(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).default('ACTIVE'),
  lyrics: z.string().optional().nullable(),
  chords: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  youtubeUrl: z.string().optional().nullable(),
});

const updateSongSchema = songSchema.partial();

const versionSchema = z.object({
  name: z.string().min(1).default('Original'),
  key: keySchema.default('C'),
  bpm: z.coerce.number().int().positive().max(320).optional().nullable(),
  durationSec: z.coerce.number().int().positive().optional().nullable(),
  lyrics: z.string().optional().nullable(),
  chords: z.string().optional().nullable(),
  contentJson: contentSchema.optional(),
  structureJson: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().optional().nullable(),
  isDefault: z.boolean().default(false),
});

const createLinkSchema = z.object({
  versionId: z.string().trim().min(1).optional().nullable(),
  title: z.string().trim().min(1, 'Titulo requerido').max(160, 'Titulo demasiado largo'),
  url: z.string().trim().min(1, 'URL requerida'),
  isPrimary: z.boolean().default(false),
});

const updateLinkSchema = z.object({
  versionId: z.string().trim().min(1).optional().nullable(),
  title: z.string().trim().min(1, 'Titulo requerido').max(160, 'Titulo demasiado largo').optional(),
  url: z.string().trim().min(1, 'URL requerida').optional(),
  isPrimary: z.boolean().optional(),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().nonnegative().optional(),
});

const reorderLinksSchema = z.object({
  versionId: z.string().trim().min(1).optional().nullable(),
  items: z.array(z.object({
    id: z.string().min(1),
    sortOrder: z.coerce.number().int().nonnegative(),
  })).min(1),
});

const listLinkQuerySchema = z.object({
  versionId: z.string().trim().min(1).optional(),
});

const baseTrackSchema = z.object({
  versionId: z.string().trim().min(1).optional().nullable(),
  name: z.string().trim().min(1, 'Nombre requerido').max(120, 'Nombre demasiado largo'),
  type: z.nativeEnum(SongTrackType).default('OTHER'),
  instrument: z.string().trim().max(80).optional().nullable(),
  url: z.string().trim().optional().nullable(),
  provider: z.nativeEnum(TrackProvider).optional(),
  durationSec: z.coerce.number().int().nonnegative().optional().nullable(),
  volumeDefault: z.coerce.number().min(0).max(1).optional(),
  panDefault: z.coerce.number().min(-1).max(1).optional(),
  isPrimary: z.boolean().default(false),
  sortOrder: z.coerce.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
});

const createTrackSchema = baseTrackSchema.superRefine((value, context) => {
  const provider = value.provider ?? 'EXTERNAL_URL';
  if ((provider === 'EXTERNAL_URL' || provider === 'OTHER') && !value.url) {
    context.addIssue({ code: 'custom', path: ['url'], message: 'URL requerida para pistas externas' });
    return;
  }
  if (value.url) {
    try {
      // eslint-disable-next-line no-new
      new URL(value.url);
    } catch {
      context.addIssue({ code: 'custom', path: ['url'], message: 'URL invalida' });
    }
  }
});

const updateTrackSchema = baseTrackSchema.partial().superRefine((value, context) => {
  if (value.url) {
    try {
      // eslint-disable-next-line no-new
      new URL(value.url);
    } catch {
      context.addIssue({ code: 'custom', path: ['url'], message: 'URL invalida' });
    }
  }
});

const reorderTrackSchema = z.object({
  versionId: z.string().trim().min(1).optional().nullable(),
  items: z.array(z.object({
    id: z.string().min(1),
    sortOrder: z.coerce.number().int().nonnegative(),
  })).min(1),
});

const copyTracksSchema = z.object({
  sourceVersionId: z.string().trim().min(1, 'Version origen requerida'),
  targetVersionId: z.string().trim().min(1, 'Version destino requerida'),
});

const SELECTABLE_SONG_FILE_CATEGORIES = [
  'LYRIC_PDF', 'CHORD_CHART', 'SHEET_MUSIC', 'LEAD_SHEET', 'PIANO_SCORE', 'GUITAR_SCORE',
  'BASS_SCORE', 'DRUM_SCORE', 'VOCAL_SCORE', 'IMAGE', 'DOCUMENT', 'PRESENTATION', 'MIDI',
  'MUSIC_XML', 'VIDEO', 'OTHER',
] as const;

const songFileCategorySchema = z.enum(SELECTABLE_SONG_FILE_CATEGORIES);

const songFileUploadBodySchema = z.object({
  versionId: z.string().trim().min(1).optional().nullable(),
  title: z.string().trim().max(160).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  category: songFileCategorySchema.default('OTHER'),
  isPrimary: z.union([z.boolean(), z.string()]).optional().transform((value) => value === true || value === 'true'),
});

const updateSongFileSchema = z.object({
  versionId: z.string().trim().min(1).optional().nullable(),
  title: z.string().trim().min(1, 'Titulo requerido').max(160).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  category: songFileCategorySchema.optional(),
  isPrimary: z.boolean().optional(),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().nonnegative().optional(),
});

const reorderSongFilesSchema = z.object({
  versionId: z.string().trim().min(1).optional().nullable(),
  items: z.array(z.object({
    id: z.string().min(1),
    sortOrder: z.coerce.number().int().nonnegative(),
  })).min(1),
});

const listSongFileQuerySchema = z.object({
  versionId: z.string().trim().min(1).optional(),
  category: songFileCategorySchema.optional(),
});

function buildInternalSongFileUrl(songId: string, songFileId: string) {
  return `/api/songs/${songId}/files/${songFileId}/download`;
}

const listTrackQuerySchema = z.object({
  versionId: z.string().trim().min(1).optional(),
  includeGeneral: z.union([z.boolean(), z.string()]).optional().transform((value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value !== 'false';
    return true;
  }),
});

const trackUploadBodySchema = z.object({
  versionId: z.string().trim().min(1).optional().nullable(),
  name: z.string().trim().min(1, 'Nombre requerido').max(120).optional(),
  type: z.nativeEnum(SongTrackType).default('OTHER'),
  instrument: z.string().trim().max(80).optional().nullable(),
  isPrimary: z.union([z.boolean(), z.string()]).optional().transform((value) => value === true || value === 'true'),
  durationSec: z.union([z.number(), z.string()]).optional().transform((value) => {
    if (value === undefined || value === '') return undefined;
    const next = Number(value);
    return Number.isFinite(next) ? Math.max(0, Math.trunc(next)) : undefined;
  }),
});

function parseTags(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
}

function buildContentJson(lyrics?: string | null, chords?: string | null) {
  return { version: 1, sections: [{ id: 'section-main-1', type: 'VERSE', name: 'Verso 1', order: 0, lines: [{ id: 'line-main-1', order: 0, chords: chords || '', lyrics: lyrics || '' }] }] };
}


function buildInternalTrackUrl(songId: string, trackId: string) {
  return `/api/songs/${songId}/tracks/${trackId}/stream`;
}

function normalizeOptionalId(value?: string | null) {
  return value ? value.trim() : null;
}

function maxTrackUploadBytes() {
  const mb = Number(process.env.MAX_TRACK_UPLOAD_MB || 100);
  return Math.max(1, Number.isFinite(mb) ? mb : 100) * 1024 * 1024;
}

function sanitizeDownloadFileName(value: string) {
  return value.replace(/[<>:"/\\|?*\x00-\x1F]+/g, '-').trim() || 'track';
}

type TrackResponseShape = {
  id: string;
  songId: string;
  versionId: string | null;
  name: string;
  type: SongTrackType;
  instrument: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  durationSec: number | null;
  originalFileName: string | null;
  url: string | null;
  provider: TrackProvider;
  volumeDefault: number;
  panDefault: number;
  isPrimary: boolean;
  sortOrder: number;
  active: boolean;
  version: { id: string; name: string; key: string; isDefault: boolean } | null;
  uploadedBy: { id: string; name: string; avatarUrl: string | null } | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class SongsService {
  constructor(
    @Inject(SongsRepository) private readonly songsRepository: SongsRepository,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
    @Inject(TRACK_STORAGE) private readonly trackStorage: TrackStorageProvider,
    @Inject(SongActivityService) private readonly activity: SongActivityService,
    @Inject(SongRevisionsService) private readonly revisions: SongRevisionsService,
  ) {}

  private async assertSongInOrganization(userId: string, organizationId: string, songId: string, permission: 'read' | 'songs.manage' = 'read') {
    if (permission === 'songs.manage') {
      await this.permissions.assertPermission(userId, organizationId, 'songs.manage');
    } else {
      await this.permissions.assertOrganizationMember(userId, organizationId);
    }

    const song = await this.songsRepository.findSongSummaryInOrganization(songId, organizationId);
    if (!song) throw new NotFoundException('Cancion no encontrada');
    return song;
  }

  private async assertVersionInSong(songId: string, versionId?: string | null) {
    const normalizedVersionId = normalizeOptionalId(versionId);
    if (!normalizedVersionId) return null;
    const version = await this.songsRepository.findVersion(songId, normalizedVersionId);
    if (!version) throw new BadRequestException('La version indicada no pertenece a esta cancion');
    return version;
  }

  private async assertTrackInSong(songId: string, trackId: string) {
    const track = await this.songsRepository.findTrack(songId, trackId);
    if (!track) throw new NotFoundException('Pista no encontrada');
    return track;
  }

  private normalizeTrackResponse(track: TrackResponseShape) {
    return {
      id: track.id,
      songId: track.songId,
      versionId: track.versionId,
      name: track.name,
      type: track.type,
      instrument: track.instrument,
      mimeType: track.mimeType,
      sizeBytes: track.sizeBytes,
      durationSec: track.durationSec,
      originalFileName: track.originalFileName,
      url: track.url || (track.provider !== 'EXTERNAL_URL' && track.provider !== 'OTHER' ? buildInternalTrackUrl(track.songId, track.id) : ''),
      provider: track.provider,
      volumeDefault: track.volumeDefault,
      panDefault: track.panDefault,
      isPrimary: track.isPrimary,
      sortOrder: track.sortOrder,
      active: track.active,
      version: track.version,
      uploadedBy: track.uploadedBy,
      createdAt: track.createdAt,
      updatedAt: track.updatedAt,
    };
  }

  private validateAudioFile(file: { mimetype?: string; size?: number; originalname?: string }) {
    const mimeType = (file.mimetype || '').toLowerCase();
    const extension = extname(file.originalname || '').toLowerCase();

    if (!ALLOWED_AUDIO_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException('Tipo de audio no soportado');
    }

    if (!ALLOWED_AUDIO_EXTENSIONS.has(extension)) {
      throw new BadRequestException('Extension de audio no soportada');
    }

    if ((file.size || 0) > maxTrackUploadBytes()) {
      throw new BadRequestException(`La pista supera el limite de ${Math.round(maxTrackUploadBytes() / 1024 / 1024)} MB`);
    }
  }

  private buildTrackStorageSegments(organizationId: string, songId: string, trackId: string, versionId?: string | null) {
    if (versionId) {
      return ['organizations', organizationId, 'songs', songId, 'versions', versionId, 'tracks', trackId];
    }
    return ['organizations', organizationId, 'songs', songId, 'tracks', trackId];
  }

  private buildSongFileStorageSegments(organizationId: string, songId: string, fileId: string, versionId?: string | null) {
    if (versionId) {
      return ['organizations', organizationId, 'songs', songId, 'versions', versionId, 'files', fileId];
    }
    return ['organizations', organizationId, 'songs', songId, 'files', fileId];
  }

  private async assertSongFileInSong(songId: string, songFileId: string) {
    const songFile = await this.songsRepository.findSongFile(songId, songFileId);
    if (!songFile) throw new NotFoundException('Archivo no encontrado');
    return songFile;
  }

  private normalizeSongFileResponse(songFile: {
    id: string;
    songId: string;
    versionId: string | null;
    category: SongFileCategory;
    title: string | null;
    description: string | null;
    isPrimary: boolean;
    sortOrder: number;
    active: boolean;
    version?: { id: string; name: string; key: string; isDefault: boolean } | null;
    file: {
      id: string;
      name: string;
      originalName: string | null;
      mimeType: string | null;
      sizeBytes: number | null;
      createdAt: Date;
      uploadedBy?: { id: string; name: string; avatarUrl: string | null } | null;
    };
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: songFile.id,
      songId: songFile.songId,
      versionId: songFile.versionId,
      category: songFile.category,
      title: songFile.title || songFile.file.name,
      description: songFile.description,
      isPrimary: songFile.isPrimary,
      sortOrder: songFile.sortOrder,
      active: songFile.active,
      version: songFile.version ?? null,
      file: {
        id: songFile.file.id,
        name: songFile.file.name,
        originalName: songFile.file.originalName,
        mimeType: songFile.file.mimeType,
        sizeBytes: songFile.file.sizeBytes,
        url: buildInternalSongFileUrl(songFile.songId, songFile.id),
        createdAt: songFile.file.createdAt,
        uploadedBy: songFile.file.uploadedBy ?? null,
      },
      createdAt: songFile.createdAt,
      updatedAt: songFile.updatedAt,
    };
  }

  async list(userId: string, organizationId: string, query: Record<string, unknown>) {
    await this.permissions.assertOrganizationMember(userId, organizationId);
    const songs = await this.songsRepository.list({
      organizationId,
      search: query.search ? String(query.search) : undefined,
      key: query.key ? String(query.key) : undefined,
      bpmMin: query.bpmMin ? Number(query.bpmMin) : undefined,
      bpmMax: query.bpmMax ? Number(query.bpmMax) : undefined,
      tag: query.tag ? String(query.tag) : undefined,
      status: query.status ? String(query.status) as 'ACTIVE' | 'DRAFT' | 'ARCHIVED' : undefined,
      favorite: query.favorite === undefined ? undefined : String(query.favorite) === 'true',
    });
    return songs.map((song) => this.normalizeSongSummary(song));
  }

  /** DTO resumen para el listado: nunca incluye contentJson/lyrics/chords ni recursos relacionados completos. */
  private normalizeSongSummary(song: {
    versions: Array<{ id: string; name: string; key: string; bpm: number | null; durationSec: number | null }>;
    _count: { versions: number; tracks: number; songFiles: number };
    [key: string]: unknown;
  }) {
    const { versions, _count, ...rest } = song;
    const defaultVersion = versions[0];
    return {
      ...rest,
      defaultVersion: defaultVersion
        ? { id: defaultVersion.id, name: defaultVersion.name, key: defaultVersion.key, bpm: defaultVersion.bpm, durationSec: defaultVersion.durationSec }
        : null,
      versionsCount: _count.versions,
      tracksCount: _count.tracks,
      filesCount: _count.songFiles,
    };
  }

  async detail(userId: string, organizationId: string, id: string) {
    await this.permissions.assertOrganizationMember(userId, organizationId);
    const song = await this.songsRepository.findByIdInOrganization(id, organizationId);
    if (!song || song.status === 'ARCHIVED') throw new NotFoundException('Cancion no encontrada');
    return {
      ...song,
      tracks: song.tracks.map((track) => this.normalizeTrackResponse(track)),
      activeVersion: song.versions.find((version) => version.isDefault) || song.versions[0] || null,
    };
  }

  async versions(userId: string, organizationId: string, songId: string) {
    await this.detail(userId, organizationId, songId);
    return this.songsRepository.listVersions(songId);
  }

  async version(userId: string, organizationId: string, songId: string, versionId: string) {
    await this.detail(userId, organizationId, songId);
    const version = await this.songsRepository.findVersion(songId, versionId);
    if (!version) throw new NotFoundException('Version no encontrada');
    return version;
  }

  async tracks(userId: string, organizationId: string, songId: string, query: Record<string, unknown>) {
    await this.assertSongInOrganization(userId, organizationId, songId);
    const parsed = listTrackQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const versionId = parsed.data.versionId ? parsed.data.versionId : undefined;
    if (versionId) await this.assertVersionInSong(songId, versionId);
    const tracks = await this.songsRepository.listTracks(songId, { versionId, includeGeneral: parsed.data.includeGeneral });
    return tracks.map((track) => this.normalizeTrackResponse(track));
  }

  async track(userId: string, organizationId: string, songId: string, trackId: string) {
    await this.assertSongInOrganization(userId, organizationId, songId);
    const track = await this.assertTrackInSong(songId, trackId);
    return this.normalizeTrackResponse(track);
  }

  async files(userId: string, organizationId: string, songId: string, query: Record<string, unknown> = {}) {
    await this.assertSongInOrganization(userId, organizationId, songId);
    const parsed = listSongFileQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const versionId = parsed.data.versionId ? parsed.data.versionId : undefined;
    if (versionId) await this.assertVersionInSong(songId, versionId);
    const files = await this.songsRepository.listFiles(songId, { versionId, category: parsed.data.category });
    return files.map((file) => this.normalizeSongFileResponse(file));
  }

  async file(userId: string, organizationId: string, songId: string, songFileId: string) {
    await this.assertSongInOrganization(userId, organizationId, songId);
    const songFile = await this.assertSongFileInSong(songId, songFileId);
    return this.normalizeSongFileResponse(songFile);
  }

  async uploadSongFile(userId: string, organizationId: string, songId: string, input: Record<string, unknown>, file?: { buffer: Buffer; size: number; mimetype: string; originalname: string }) {
    await this.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
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

    const version = await this.assertVersionInSong(songId, parsed.data.versionId);
    const fileId = `file_${randomUUID().replace(/-/g, '')}`;
    const storage = await this.trackStorage.upload(
      file.buffer,
      this.buildSongFileStorageSegments(organizationId, songId, fileId, version?.id),
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
      return this.normalizeSongFileResponse(created);
    } catch (error) {
      await this.trackStorage.delete(storage.storageKey);
      throw error;
    }
  }

  async updateSongFile(userId: string, organizationId: string, songId: string, songFileId: string, input: Record<string, unknown>) {
    await this.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    await this.assertSongFileInSong(songId, songFileId);
    const parsed = updateSongFileSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const version = parsed.data.versionId === undefined ? undefined : await this.assertVersionInSong(songId, parsed.data.versionId);

    const updated = await this.songsRepository.updateSongFile(songFileId, clean({
      versionId: parsed.data.versionId === undefined ? undefined : version?.id ?? null,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      isPrimary: parsed.data.isPrimary,
      active: parsed.data.active,
      sortOrder: parsed.data.sortOrder,
    }));
    return this.normalizeSongFileResponse(updated);
  }

  async deleteSongFile(userId: string, organizationId: string, songId: string, songFileId: string) {
    await this.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    const existing = await this.assertSongFileInSong(songId, songFileId);
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
    await this.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    await this.assertSongFileInSong(songId, songFileId);
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
    return this.normalizeSongFileResponse(songFile);
  }

  async reorderSongFiles(userId: string, organizationId: string, songId: string, input: Record<string, unknown>) {
    await this.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    const parsed = reorderSongFilesSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const version = await this.assertVersionInSong(songId, parsed.data.versionId);
    const files = await this.songsRepository.reorderSongFiles(songId, version?.id || null, parsed.data.items);
    return files.map((file) => this.normalizeSongFileResponse(file));
  }

  async songFileAsset(userId: string, organizationId: string, songId: string, songFileId: string) {
    await this.assertSongInOrganization(userId, organizationId, songId);
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

  async create(userId: string, organizationId: string, input: Record<string, unknown>) {
    await this.permissions.assertPermission(userId, organizationId, 'songs.manage');
    const parsed = songSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const song = parsed.data;
    const youtubeLinkInput = song.youtubeUrl ? this.buildYoutubeLinkCreateInput(song.youtubeUrl, userId) : undefined;

    const created = await this.songsRepository.createWithDefaultVersion(
      {
        organization: { connect: { id: organizationId } },
        title: song.title,
        artist: song.artist,
        album: song.album,
        year: song.year,
        genre: song.genre,
        originalKey: song.originalKey,
        currentKey: song.currentKey,
        bpm: song.bpm,
        durationSec: song.durationSec,
        timeSignature: song.timeSignature,
        language: song.language,
        isFavorite: song.isFavorite,
        coverUrl: song.coverUrl,
        youtubeUrl: song.youtubeUrl,
        lyrics: song.lyrics,
        chords: song.chords,
        notes: song.notes,
        tags: parseTags(song.tags),
        status: song.status,
        ...(song.youtubeUrl && youtubeLinkInput ? { links: { create: youtubeLinkInput } } : {}),
      },
      {
        name: 'Original',
        key: song.currentKey || song.originalKey || 'C',
        bpm: song.bpm,
        durationSec: song.durationSec,
        lyrics: song.lyrics,
        chords: song.chords,
        contentJson: buildContentJson(song.lyrics, song.chords),
        notes: song.notes,
        isDefault: true,
      },
    );

    const defaultVersion = created.versions[0];
    await this.activity.recordBestEffort({
      songId: created.id,
      organizationId,
      actorId: userId,
      action: 'SONG_CREATED',
      entityType: 'SONG',
      entityId: created.id,
      summary: `Creó la canción "${created.title}"`,
    });
    if (defaultVersion) {
      await this.revisions.ensureRevisionForVersionChange({
        songId: created.id,
        versionId: defaultVersion.id,
        organizationId,
        actorId: userId,
        source: 'MANUAL_SAVE',
        reason: 'Versión creada',
        snapshot: {
          name: defaultVersion.name,
          key: defaultVersion.key,
          bpm: defaultVersion.bpm,
          durationSec: defaultVersion.durationSec,
          contentJson: defaultVersion.contentJson,
          structureJson: defaultVersion.structureJson,
          lyrics: defaultVersion.lyrics,
          chords: defaultVersion.chords,
          notes: defaultVersion.notes,
        },
      });
    }

    return created;
  }

  async update(userId: string, organizationId: string, id: string, input: Record<string, unknown>) {
    await this.permissions.assertPermission(userId, organizationId, 'songs.manage');
    const existing = await this.detail(userId, organizationId, id);
    const parsed = updateSongSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const song = parsed.data;
    const patch = clean({
      title: song.title,
      artist: song.artist,
      album: song.album,
      year: song.year,
      genre: song.genre,
      originalKey: song.originalKey,
      currentKey: song.currentKey,
      bpm: song.bpm,
      durationSec: song.durationSec,
      timeSignature: song.timeSignature,
      language: song.language,
      isFavorite: song.isFavorite,
      coverUrl: song.coverUrl,
      lyrics: song.lyrics,
      chords: song.chords,
      notes: song.notes,
      tags: song.tags === undefined ? undefined : parseTags(song.tags),
      status: song.status,
    });
    const updated = await this.songsRepository.update(id, patch);

    const changedFields = Object.keys(patch).filter((field) => (existing as any)[field] !== (patch as any)[field]);
    if (changedFields.length > 0) {
      await this.activity.recordBestEffort({
        songId: id,
        organizationId,
        actorId: userId,
        action: 'SONG_UPDATED',
        entityType: 'SONG',
        entityId: id,
        summary: `Actualizó "${existing.title}"`,
        metadata: { changedFields },
      });
    }
    if (patch.isFavorite !== undefined && patch.isFavorite !== existing.isFavorite) {
      await this.activity.recordBestEffort({
        songId: id,
        organizationId,
        actorId: userId,
        action: 'FAVORITE_CHANGED',
        entityType: 'SONG',
        entityId: id,
        summary: patch.isFavorite ? `Marcó "${existing.title}" como favorita` : `Quitó "${existing.title}" de favoritas`,
      });
    }

    return updated;
  }

  async archive(userId: string, organizationId: string, id: string) {
    await this.permissions.assertPermission(userId, organizationId, 'songs.manage');
    const existing = await this.detail(userId, organizationId, id);
    const archived = await this.songsRepository.archive(id);
    await this.activity.recordBestEffort({
      songId: id,
      organizationId,
      actorId: userId,
      action: 'SONG_ARCHIVED',
      entityType: 'SONG',
      entityId: id,
      summary: `Archivó "${existing.title}"`,
    });
    return archived;
  }

  async createVersion(userId: string, organizationId: string, songId: string, input: Record<string, unknown>) {
    await this.permissions.assertPermission(userId, organizationId, 'songs.manage');
    await this.detail(userId, organizationId, songId);
    const parsed = versionSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const version = parsed.data;
    const created = await this.songsRepository.createVersion({
      songId,
      name: version.name,
      key: version.key,
      bpm: version.bpm,
      durationSec: version.durationSec,
      lyrics: version.lyrics,
      chords: version.chords,
      contentJson: (version.contentJson || buildContentJson(version.lyrics, version.chords)) as Prisma.InputJsonValue,
      structureJson: version.structureJson as Prisma.InputJsonValue | undefined,
      notes: version.notes,
      isDefault: version.isDefault,
    });

    await this.activity.recordBestEffort({
      songId,
      versionId: created.id,
      organizationId,
      actorId: userId,
      action: 'VERSION_CREATED',
      entityType: 'VERSION',
      entityId: created.id,
      summary: `Creó la versión "${created.name}"`,
    });
    await this.revisions.ensureRevisionForVersionChange({
      songId,
      versionId: created.id,
      organizationId,
      actorId: userId,
      source: 'MANUAL_SAVE',
      reason: 'Versión creada',
      snapshot: {
        name: created.name,
        key: created.key,
        bpm: created.bpm,
        durationSec: created.durationSec,
        contentJson: created.contentJson,
        structureJson: created.structureJson,
        lyrics: created.lyrics,
        chords: created.chords,
        notes: created.notes,
      },
    });

    return created;
  }

  async updateVersion(userId: string, organizationId: string, songId: string, versionId: string, input: Record<string, unknown>) {
    await this.permissions.assertPermission(userId, organizationId, 'songs.manage');
    const before = await this.version(userId, organizationId, songId, versionId);
    const parsed = versionSchema.partial().safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const updated = await this.songsRepository.updateVersion(versionId, clean({
      ...parsed.data,
      contentJson: parsed.data.contentJson as Prisma.InputJsonValue | undefined,
      structureJson: parsed.data.structureJson as Prisma.InputJsonValue | undefined,
    }));

    // Un cambio de tonalidad se trata como transposicion permanente (via UI de transponer o edicion directa).
    const keyChanged = parsed.data.key !== undefined && parsed.data.key !== before.key;
    await this.activity.recordBestEffort({
      songId,
      versionId,
      organizationId,
      actorId: userId,
      action: keyChanged ? 'VERSION_TRANSPOSED' : 'VERSION_UPDATED',
      entityType: 'VERSION',
      entityId: versionId,
      summary: keyChanged ? `Transpuso "${updated.name}" de ${before.key} a ${updated.key}` : `Actualizó "${updated.name}"`,
      metadata: keyChanged ? { fromKey: before.key, toKey: updated.key } : undefined,
    });
    await this.revisions.ensureRevisionForVersionChange({
      songId,
      versionId,
      organizationId,
      actorId: userId,
      source: keyChanged ? 'TRANSPOSE' : 'MANUAL_SAVE',
      reason: keyChanged ? `Transposición de ${before.key} a ${updated.key}` : undefined,
      snapshot: {
        name: updated.name,
        key: updated.key,
        bpm: updated.bpm,
        durationSec: updated.durationSec,
        contentJson: updated.contentJson,
        structureJson: updated.structureJson,
        lyrics: updated.lyrics,
        chords: updated.chords,
        notes: updated.notes,
      },
    });

    return updated;
  }

  async setDefaultVersion(userId: string, organizationId: string, songId: string, versionId: string) {
    await this.permissions.assertPermission(userId, organizationId, 'songs.manage');
    const version = await this.version(userId, organizationId, songId, versionId);
    const updated = await this.songsRepository.setDefaultVersion(songId, versionId);
    await this.activity.recordBestEffort({
      songId,
      versionId,
      organizationId,
      actorId: userId,
      action: 'VERSION_SET_DEFAULT',
      entityType: 'VERSION',
      entityId: versionId,
      summary: `Marcó "${version.name}" como versión predeterminada`,
    });
    return updated;
  }

  async deleteVersion(userId: string, organizationId: string, songId: string, versionId: string) {
    await this.permissions.assertPermission(userId, organizationId, 'songs.manage');
    const version = await this.version(userId, organizationId, songId, versionId);
    let result;
    try {
      result = await this.songsRepository.deleteVersion(songId, versionId);
    } catch (error: any) {
      // El adaptor @prisma/adapter-pg reporta violaciones de restriccion RESTRICT
      // como un DriverAdapterError con el codigo SQLSTATE original en `cause.code`
      // (no como un PrismaClientKnownRequestError con `code` P2003 estandar).
      const pgErrorCode = error?.cause?.code || error?.code;
      if (pgErrorCode === 'P2003' || pgErrorCode === '23503' || pgErrorCode === '23001') {
        throw new BadRequestException('No se puede eliminar esta version: esta siendo usada en un setlist.');
      }
      throw error;
    }
    await this.activity.recordBestEffort({
      songId,
      organizationId,
      actorId: userId,
      action: 'VERSION_DELETED',
      entityType: 'VERSION',
      entityId: versionId,
      summary: `Eliminó la versión "${version.name}"`,
    });
    return result;
  }

  private async assertLinkInSong(songId: string, linkId: string) {
    const link = await this.songsRepository.findLink(songId, linkId);
    if (!link) throw new NotFoundException('Enlace no encontrado');
    return link;
  }

  private resolveLinkUrl(rawUrl: string) {
    try {
      return resolveSongLink(rawUrl);
    } catch (error) {
      if (error instanceof InvalidLinkUrlError) throw new BadRequestException(error.message);
      throw error;
    }
  }

  /** Compatibilidad legacy: el campo `youtubeUrl` de Song sigue generando un SongLink principal. */
  private buildYoutubeLinkCreateInput(youtubeUrl: string, userId: string) {
    try {
      const resolved = resolveSongLink(youtubeUrl);
      return {
        provider: resolved.provider,
        url: resolved.url,
        title: 'YouTube',
        isPrimary: true,
        externalId: resolved.externalId,
        embedUrl: resolved.embedUrl,
        thumbnailUrl: resolved.thumbnailUrl,
        createdById: userId,
        sortOrder: 0,
        active: true,
      };
    } catch {
      return undefined;
    }
  }

  private normalizeLinkResponse(link: {
    id: string;
    songId: string;
    versionId: string | null;
    provider: string;
    title: string | null;
    url: string;
    externalId: string | null;
    embedUrl: string | null;
    thumbnailUrl: string | null;
    isPrimary: boolean;
    sortOrder: number;
    active: boolean;
    version?: { id: string; name: string; key: string; isDefault: boolean } | null;
    createdBy?: { id: string; name: string; avatarUrl: string | null } | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: link.id,
      songId: link.songId,
      versionId: link.versionId,
      provider: link.provider,
      title: link.title,
      url: link.url,
      externalId: link.externalId,
      embedUrl: link.embedUrl,
      thumbnailUrl: link.thumbnailUrl,
      isPrimary: link.isPrimary,
      sortOrder: link.sortOrder,
      active: link.active,
      version: link.version ?? null,
      createdBy: link.createdBy ?? null,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
    };
  }

  async links(userId: string, organizationId: string, songId: string, query: Record<string, unknown> = {}) {
    await this.assertSongInOrganization(userId, organizationId, songId);
    const parsed = listLinkQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const versionId = parsed.data.versionId ? parsed.data.versionId : undefined;
    if (versionId) await this.assertVersionInSong(songId, versionId);
    const links = await this.songsRepository.listLinks(songId, { versionId });
    return links.map((link) => this.normalizeLinkResponse(link));
  }

  async link(userId: string, organizationId: string, songId: string, linkId: string) {
    await this.assertSongInOrganization(userId, organizationId, songId);
    const link = await this.assertLinkInSong(songId, linkId);
    return this.normalizeLinkResponse(link);
  }

  async createLink(userId: string, organizationId: string, songId: string, input: Record<string, unknown>) {
    await this.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    const parsed = createLinkSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const version = await this.assertVersionInSong(songId, parsed.data.versionId);
    const resolved = this.resolveLinkUrl(parsed.data.url);
    const sortOrder = await this.songsRepository.nextLinkSortOrder(songId, version?.id || null);

    const created = await this.songsRepository.createLink({
      songId,
      versionId: version?.id,
      createdById: userId,
      provider: resolved.provider,
      url: resolved.url,
      title: parsed.data.title,
      externalId: resolved.externalId,
      embedUrl: resolved.embedUrl,
      thumbnailUrl: resolved.thumbnailUrl,
      isPrimary: parsed.data.isPrimary,
      sortOrder,
      active: true,
    });
    await this.activity.recordBestEffort({
      songId,
      versionId: version?.id ?? null,
      organizationId,
      actorId: userId,
      action: 'LINK_ADDED',
      entityType: 'LINK',
      entityId: created.id,
      summary: `Agregó el enlace "${created.title || created.url}"`,
      metadata: { provider: created.provider },
    });
    return this.normalizeLinkResponse(created);
  }

  async updateLink(userId: string, organizationId: string, songId: string, linkId: string, input: Record<string, unknown>) {
    await this.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    await this.assertLinkInSong(songId, linkId);
    const parsed = updateLinkSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    const version = parsed.data.versionId === undefined ? undefined : await this.assertVersionInSong(songId, parsed.data.versionId);
    const resolved = parsed.data.url === undefined ? null : this.resolveLinkUrl(parsed.data.url);

    const updated = await this.songsRepository.updateLink(linkId, clean({
      versionId: parsed.data.versionId === undefined ? undefined : version?.id ?? null,
      title: parsed.data.title,
      isPrimary: parsed.data.isPrimary,
      active: parsed.data.active,
      sortOrder: parsed.data.sortOrder,
      provider: resolved?.provider,
      url: resolved?.url,
      externalId: resolved?.externalId,
      embedUrl: resolved?.embedUrl,
      thumbnailUrl: resolved?.thumbnailUrl,
    }));
    return this.normalizeLinkResponse(updated);
  }

  async deleteLink(userId: string, organizationId: string, songId: string, linkId: string) {
    await this.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    const link = await this.assertLinkInSong(songId, linkId);
    await this.songsRepository.deleteLink(linkId);
    await this.activity.recordBestEffort({
      songId,
      versionId: link.versionId,
      organizationId,
      actorId: userId,
      action: 'LINK_DELETED',
      entityType: 'LINK',
      entityId: linkId,
      summary: `Eliminó el enlace "${link.title || link.url}"`,
    });
    return { ok: true };
  }

  async setPrimaryLink(userId: string, organizationId: string, songId: string, linkId: string) {
    await this.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    await this.assertLinkInSong(songId, linkId);
    const link = await this.songsRepository.setLinkPrimary(songId, linkId);
    await this.activity.recordBestEffort({
      songId,
      versionId: link.versionId,
      organizationId,
      actorId: userId,
      action: 'LINK_SET_PRIMARY',
      entityType: 'LINK',
      entityId: linkId,
      summary: `Marcó "${link.title || link.url}" como enlace principal`,
    });
    return this.normalizeLinkResponse(link);
  }

  async reorderLinks(userId: string, organizationId: string, songId: string, input: Record<string, unknown>) {
    await this.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    const parsed = reorderLinksSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const version = await this.assertVersionInSong(songId, parsed.data.versionId);
    const links = await this.songsRepository.reorderLinks(songId, version?.id || null, parsed.data.items);
    return links.map((link) => this.normalizeLinkResponse(link));
  }

  async createTrack(userId: string, organizationId: string, songId: string, input: Record<string, unknown>) {
    await this.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    const parsed = createTrackSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const version = await this.assertVersionInSong(songId, parsed.data.versionId);
    const sortOrder = parsed.data.sortOrder ?? await this.songsRepository.nextTrackSortOrder(songId, version?.id || null);
    const provider = parsed.data.provider ?? 'EXTERNAL_URL';
    const created = await this.songsRepository.createTrack({
      songId,
      versionId: version?.id,
      name: parsed.data.name,
      type: parsed.data.type,
      instrument: parsed.data.instrument,
      durationSec: parsed.data.durationSec,
      url: parsed.data.url,
      provider,
      volumeDefault: parsed.data.volumeDefault ?? 1,
      panDefault: parsed.data.panDefault ?? 0,
      isPrimary: parsed.data.isPrimary,
      sortOrder,
      active: parsed.data.active ?? true,
    });
    await this.activity.recordBestEffort({
      songId,
      versionId: version?.id ?? null,
      organizationId,
      actorId: userId,
      action: 'TRACK_ADDED',
      entityType: 'TRACK',
      entityId: created.id,
      summary: `Agregó la pista "${created.name}"`,
      metadata: { trackType: created.type, trackName: created.name },
    });
    return this.normalizeTrackResponse(created);
  }

  async uploadTrack(userId: string, organizationId: string, songId: string, input: Record<string, unknown>, file?: { buffer: Buffer; size: number; mimetype: string; originalname: string }) {
    await this.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    if (!file) throw new BadRequestException('Archivo requerido');
    this.validateAudioFile(file);

    const parsed = trackUploadBodySchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    const version = await this.assertVersionInSong(songId, parsed.data.versionId);
    const trackId = `track_${randomUUID().replace(/-/g, '')}`;
    const storage = await this.trackStorage.upload(
      file.buffer,
      this.buildTrackStorageSegments(organizationId, songId, trackId, version?.id),
      file.originalname,
      file.mimetype,
    );

    try {
      const sortOrder = await this.songsRepository.nextTrackSortOrder(songId, version?.id || null);
      const created = await this.songsRepository.createTrack({
        id: trackId,
        songId,
        versionId: version?.id,
        uploadedById: userId,
        name: parsed.data.name || file.originalname.replace(/\.[^.]+$/, ''),
        type: parsed.data.type,
        instrument: parsed.data.instrument,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        durationSec: parsed.data.durationSec,
        originalFileName: file.originalname,
        storageKey: storage.storageKey,
        url: buildInternalTrackUrl(songId, trackId),
        provider: 'UPLOAD',
        volumeDefault: 1,
        panDefault: 0,
        isPrimary: parsed.data.isPrimary ?? sortOrder === 0,
        sortOrder,
        active: true,
      });
      await this.activity.recordBestEffort({
        songId,
        versionId: version?.id ?? null,
        organizationId,
        actorId: userId,
        action: 'TRACK_ADDED',
        entityType: 'TRACK',
        entityId: created.id,
        summary: `Subió la pista "${created.name}"`,
        metadata: { trackType: created.type, trackName: created.name },
      });
      return this.normalizeTrackResponse(created);
    } catch (error) {
      await this.trackStorage.delete(storage.storageKey);
      throw error;
    }
  }

  async updateTrack(userId: string, organizationId: string, songId: string, trackId: string, input: Record<string, unknown>) {
    await this.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    const existing = await this.assertTrackInSong(songId, trackId);
    const parsed = updateTrackSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const version = parsed.data.versionId === undefined ? await this.assertVersionInSong(songId, existing.versionId) : await this.assertVersionInSong(songId, parsed.data.versionId);
    const provider = parsed.data.provider ?? existing.provider;

    if ((provider === 'EXTERNAL_URL' || provider === 'OTHER') && parsed.data.url !== undefined && parsed.data.url === null) {
      throw new BadRequestException('La URL externa no puede quedar vacia');
    }

    const updated = await this.songsRepository.updateTrack(trackId, clean({
      versionId: parsed.data.versionId === undefined ? undefined : version?.id ?? null,
      name: parsed.data.name,
      type: parsed.data.type,
      instrument: parsed.data.instrument,
      durationSec: parsed.data.durationSec,
      url: parsed.data.url,
      provider: parsed.data.provider,
      volumeDefault: parsed.data.volumeDefault,
      panDefault: parsed.data.panDefault,
      isPrimary: parsed.data.isPrimary,
      sortOrder: parsed.data.sortOrder,
      active: parsed.data.active,
    }));
    return this.normalizeTrackResponse(updated);
  }

  async deleteTrack(userId: string, organizationId: string, songId: string, trackId: string) {
    await this.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    const track = await this.assertTrackInSong(songId, trackId);
    if (track.storageKey && track.provider !== 'EXTERNAL_URL' && track.provider !== 'OTHER') {
      // El binario puede estar referenciado por otras pistas (copias entre
      // versiones). Solo se elimina fisicamente cuando es la ultima referencia.
      const otherReferences = await this.songsRepository.countTracksByStorageKey(track.storageKey, trackId);
      if (otherReferences === 0) {
        await this.trackStorage.delete(track.storageKey);
      }
    }
    await this.songsRepository.deleteTrack(trackId);
    await this.activity.recordBestEffort({
      songId,
      versionId: track.versionId,
      organizationId,
      actorId: userId,
      action: 'TRACK_DELETED',
      entityType: 'TRACK',
      entityId: trackId,
      summary: `Eliminó la pista "${track.name}"`,
    });
    return { ok: true };
  }

  async setPrimaryTrack(userId: string, organizationId: string, songId: string, trackId: string) {
    await this.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    await this.assertTrackInSong(songId, trackId);
    const track = await this.songsRepository.setTrackPrimary(songId, trackId);
    await this.activity.recordBestEffort({
      songId,
      versionId: track.versionId,
      organizationId,
      actorId: userId,
      action: 'TRACK_SET_PRIMARY',
      entityType: 'TRACK',
      entityId: trackId,
      summary: `Marcó "${track.name}" como pista principal`,
    });
    return this.normalizeTrackResponse(track);
  }

  async reorderTracks(userId: string, organizationId: string, songId: string, input: Record<string, unknown>) {
    await this.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    const parsed = reorderTrackSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const version = await this.assertVersionInSong(songId, parsed.data.versionId);
    const tracks = await this.songsRepository.reorderTracks(songId, version?.id || null, parsed.data.items);
    return tracks.map((track) => this.normalizeTrackResponse(track));
  }

  async copyTrackReferences(userId: string, organizationId: string, songId: string, input: Record<string, unknown>) {
    await this.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    const parsed = copyTracksSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    if (parsed.data.sourceVersionId === parsed.data.targetVersionId) {
      throw new BadRequestException('El origen y el destino deben ser versiones distintas');
    }

    // Ambas versiones deben pertenecer a esta cancion (assertVersionInSong lanza si no).
    const source = await this.assertVersionInSong(songId, parsed.data.sourceVersionId);
    const target = await this.assertVersionInSong(songId, parsed.data.targetVersionId);
    if (!source || !target) throw new BadRequestException('Version invalida');

    const created = await this.songsRepository.copyTrackReferences({
      songId,
      sourceVersionId: source.id,
      targetVersionId: target.id,
      uploadedById: userId,
      buildInternalUrl: (trackId: string) => buildInternalTrackUrl(songId, trackId),
      makeTrackId: () => `track_${randomUUID().replace(/-/g, '')}`,
    });

    return { copied: created.length, tracks: created.map((track) => this.normalizeTrackResponse(track)) };
  }

  async trackAsset(userId: string, organizationId: string, songId: string, trackId: string) {
    await this.assertSongInOrganization(userId, organizationId, songId);
    return this.songsRepository.songTrackFileContext(songId, trackId);
  }

  async downloadFileName(userId: string, organizationId: string, songId: string, trackId: string) {
    const track = await this.trackAsset(userId, organizationId, songId, trackId);
    const extension = extname(track.originalFileName || track.url || track.name) || '.mp3';
    return `${sanitizeDownloadFileName(track.song.title)} - ${sanitizeDownloadFileName(track.name)}${extension.toLowerCase()}`;
  }

  async storageStream(storageKey: string) {
    const exists = await this.trackStorage.exists(storageKey);
    if (!exists) throw new NotFoundException('Archivo no encontrado');
    return await this.trackStorage.createReadStream(storageKey);
  }
}
