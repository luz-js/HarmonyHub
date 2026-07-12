import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SongLinkProvider, SongNoteVisibility, SongTrackType } from '@prisma/client';
import { z } from 'zod';
import { PermissionsService } from '../permissions/permissions.service';
import { SongsRepository } from './songs.repository';

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

const linkSchema = z.object({
  versionId: z.string().optional().nullable(),
  provider: z.nativeEnum(SongLinkProvider).default('OTHER'),
  url: z.string().min(1),
  title: z.string().optional().nullable(),
  isPrimary: z.boolean().default(false),
});

const noteSchema = z.object({
  versionId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
  organizationId: z.string().min(1),
  content: z.string().min(1),
  visibility: z.nativeEnum(SongNoteVisibility).default('ORGANIZATION'),
});

const trackSchema = z.object({
  versionId: z.string().optional().nullable(),
  name: z.string().min(1),
  type: z.nativeEnum(SongTrackType).default('OTHER'),
  instrument: z.string().optional().nullable(),
  durationSec: z.coerce.number().int().positive().optional().nullable(),
  storageKey: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  provider: z.string().optional().nullable(),
  volumeDefault: z.coerce.number().optional().nullable(),
  panDefault: z.coerce.number().optional().nullable(),
  isPrimary: z.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
});

function parseTags(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
}

function buildContentJson(lyrics?: string | null, chords?: string | null) {
  return { version: 1, sections: [{ id: 'section-main-1', type: 'VERSE', name: 'Verso 1', order: 0, lines: [{ id: 'line-main-1', order: 0, chords: chords || '', lyrics: lyrics || '' }] }] };
}

function clean<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

@Injectable()
export class SongsService {
  constructor(
    @Inject(SongsRepository) private readonly songsRepository: SongsRepository,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
  ) {}

  async list(userId: string, organizationId: string, query: Record<string, unknown>) {
    await this.permissions.assertOrganizationMember(userId, organizationId);
    return this.songsRepository.list({
      organizationId,
      search: query.search ? String(query.search) : undefined,
      key: query.key ? String(query.key) : undefined,
      bpmMin: query.bpmMin ? Number(query.bpmMin) : undefined,
      bpmMax: query.bpmMax ? Number(query.bpmMax) : undefined,
      tag: query.tag ? String(query.tag) : undefined,
      status: query.status ? String(query.status) as 'ACTIVE' | 'DRAFT' | 'ARCHIVED' : undefined,
      favorite: query.favorite === undefined ? undefined : String(query.favorite) === 'true',
    });
  }

  async detail(userId: string, organizationId: string, id: string) {
    await this.permissions.assertOrganizationMember(userId, organizationId);
    const song = await this.songsRepository.findByIdInOrganization(id, organizationId);
    if (!song || song.status === 'ARCHIVED') throw new NotFoundException('Cancion no encontrada');
    return { ...song, activeVersion: song.versions.find((version) => version.isDefault) || song.versions[0] || null };
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

  async tracks(userId: string, organizationId: string, songId: string) {
    await this.detail(userId, organizationId, songId);
    return this.songsRepository.listTracks(songId);
  }

  async links(userId: string, organizationId: string, songId: string) {
    await this.detail(userId, organizationId, songId);
    return this.songsRepository.listLinks(songId);
  }

  async files(userId: string, organizationId: string, songId: string) {
    await this.detail(userId, organizationId, songId);
    return this.songsRepository.listFiles(songId);
  }

  async notes(userId: string, organizationId: string, songId: string) {
    await this.detail(userId, organizationId, songId);
    return this.songsRepository.listNotes(songId);
  }

  async create(userId: string, organizationId: string, input: Record<string, unknown>) {
    await this.permissions.assertPermission(userId, organizationId, 'songs.manage');
    const parsed = songSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const song = parsed.data;

    return this.songsRepository.createWithDefaultVersion(
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
        ...(song.youtubeUrl ? { links: { create: { provider: 'YOUTUBE', url: song.youtubeUrl, title: 'YouTube', isPrimary: true } } } : {}),
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
  }

  async update(userId: string, organizationId: string, id: string, input: Record<string, unknown>) {
    await this.permissions.assertPermission(userId, organizationId, 'songs.manage');
    await this.detail(userId, organizationId, id);
    const parsed = updateSongSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const song = parsed.data;
    return this.songsRepository.update(id, clean({
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
    }));
  }

  async archive(userId: string, organizationId: string, id: string) {
    await this.permissions.assertPermission(userId, organizationId, 'songs.manage');
    await this.detail(userId, organizationId, id);
    return this.songsRepository.archive(id);
  }

  async createVersion(userId: string, organizationId: string, songId: string, input: Record<string, unknown>) {
    await this.permissions.assertPermission(userId, organizationId, 'songs.manage');
    await this.detail(userId, organizationId, songId);
    const parsed = versionSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const version = parsed.data;
    return this.songsRepository.createVersion({
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
  }

  async updateVersion(userId: string, organizationId: string, songId: string, versionId: string, input: Record<string, unknown>) {
    await this.permissions.assertPermission(userId, organizationId, 'songs.manage');
    await this.version(userId, organizationId, songId, versionId);
    const parsed = versionSchema.partial().safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    return this.songsRepository.updateVersion(versionId, clean({
      ...parsed.data,
      contentJson: parsed.data.contentJson as Prisma.InputJsonValue | undefined,
      structureJson: parsed.data.structureJson as Prisma.InputJsonValue | undefined,
    }));
  }

  async setDefaultVersion(userId: string, organizationId: string, songId: string, versionId: string) {
    await this.permissions.assertPermission(userId, organizationId, 'songs.manage');
    await this.version(userId, organizationId, songId, versionId);
    return this.songsRepository.setDefaultVersion(songId, versionId);
  }

  async deleteVersion(userId: string, organizationId: string, songId: string, versionId: string) {
    await this.permissions.assertPermission(userId, organizationId, 'songs.manage');
    await this.version(userId, organizationId, songId, versionId);
    return this.songsRepository.deleteVersion(songId, versionId);
  }

  async createLink(userId: string, organizationId: string, songId: string, input: Record<string, unknown>) {
    await this.permissions.assertPermission(userId, organizationId, 'songs.manage');
    await this.detail(userId, organizationId, songId);
    const parsed = linkSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    return this.songsRepository.createLink({ songId, ...parsed.data });
  }

  async updateLink(userId: string, organizationId: string, songId: string, linkId: string, input: Record<string, unknown>) {
    await this.permissions.assertPermission(userId, organizationId, 'songs.manage');
    await this.detail(userId, organizationId, songId);
    const parsed = linkSchema.partial().safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    return this.songsRepository.updateLink(linkId, parsed.data);
  }

  async createNote(userId: string, organizationId: string, songId: string, input: Record<string, unknown>) {
    await this.detail(userId, organizationId, songId);
    const parsed = noteSchema.safeParse({ organizationId, userId, ...input });
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    return this.songsRepository.createNote({ songId, ...parsed.data });
  }

  async updateNote(userId: string, organizationId: string, songId: string, noteId: string, input: Record<string, unknown>) {
    await this.detail(userId, organizationId, songId);
    const parsed = noteSchema.pick({ content: true, visibility: true }).partial().safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    return this.songsRepository.updateNote(noteId, parsed.data);
  }

  async createTrack(userId: string, organizationId: string, songId: string, input: Record<string, unknown>) {
    await this.permissions.assertPermission(userId, organizationId, 'songs.manage');
    await this.detail(userId, organizationId, songId);
    const parsed = trackSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    return this.songsRepository.createTrack({ songId, ...parsed.data });
  }

  async updateTrack(userId: string, organizationId: string, songId: string, trackId: string, input: Record<string, unknown>) {
    await this.permissions.assertPermission(userId, organizationId, 'songs.manage');
    await this.detail(userId, organizationId, songId);
    const parsed = trackSchema.partial().safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    return this.songsRepository.updateTrack(trackId, parsed.data);
  }
}
