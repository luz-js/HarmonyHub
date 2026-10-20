import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PermissionsService } from '../permissions/permissions.service';
import { clean } from '../shared/object.utils';
import { SongActivityService } from './activity/song-activity.service';
import { SongRevisionsService } from './history/song-revisions.service';
import { SongsAccessService } from './songs-access.service';
import { SongsFilesService } from './songs-files.service';
import { buildYoutubeLinkCreateInput } from './songs-links.helpers';
import { SongsLinksService } from './songs-links.service';
import { normalizeSongSummary, normalizeTrackResponse } from './songs.presenter';
import { SongsRepository } from './songs.repository';
import { buildContentJson, parseTags, songSchema, updateSongSchema } from './songs.schemas';
import { SongsTracksService } from './songs-tracks.service';
import { SongsVersionsService } from './songs-versions.service';

type UploadedBinary = {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
};

@Injectable()
export class SongsService {
  constructor(
    @Inject(SongsRepository) private readonly songsRepository: SongsRepository,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
    @Inject(SongActivityService) private readonly activity: SongActivityService,
    @Inject(SongRevisionsService) private readonly revisions: SongRevisionsService,
    @Inject(SongsAccessService) private readonly access: SongsAccessService,
    @Inject(SongsVersionsService) private readonly versionsService: SongsVersionsService,
    @Inject(SongsLinksService) private readonly linksService: SongsLinksService,
    @Inject(SongsTracksService) private readonly tracksService: SongsTracksService,
    @Inject(SongsFilesService) private readonly filesService: SongsFilesService,
  ) {}

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
    return songs.map((song) => normalizeSongSummary(song));
  }

  async detail(userId: string, organizationId: string, id: string) {
    const song = await this.access.assertSongDetailInOrganization(userId, organizationId, id);
    return {
      ...song,
      tracks: song.tracks.map((track) => normalizeTrackResponse(track)),
      activeVersion: song.versions.find((version) => version.isDefault) || song.versions[0] || null,
    };
  }

  async versions(userId: string, organizationId: string, songId: string) {
    return this.versionsService.versions(userId, organizationId, songId);
  }

  async version(userId: string, organizationId: string, songId: string, versionId: string) {
    return this.versionsService.version(userId, organizationId, songId, versionId);
  }

  async tracks(userId: string, organizationId: string, songId: string, query: Record<string, unknown>) {
    return this.tracksService.tracks(userId, organizationId, songId, query);
  }

  async track(userId: string, organizationId: string, songId: string, trackId: string) {
    return this.tracksService.track(userId, organizationId, songId, trackId);
  }

  async files(userId: string, organizationId: string, songId: string, query: Record<string, unknown> = {}) {
    return this.filesService.files(userId, organizationId, songId, query);
  }

  async file(userId: string, organizationId: string, songId: string, songFileId: string) {
    return this.filesService.file(userId, organizationId, songId, songFileId);
  }

  async uploadSongFile(userId: string, organizationId: string, songId: string, input: Record<string, unknown>, file?: UploadedBinary) {
    return this.filesService.uploadSongFile(userId, organizationId, songId, input, file);
  }

  async updateSongFile(userId: string, organizationId: string, songId: string, songFileId: string, input: Record<string, unknown>) {
    return this.filesService.updateSongFile(userId, organizationId, songId, songFileId, input);
  }

  async deleteSongFile(userId: string, organizationId: string, songId: string, songFileId: string) {
    return this.filesService.deleteSongFile(userId, organizationId, songId, songFileId);
  }

  async setPrimarySongFile(userId: string, organizationId: string, songId: string, songFileId: string) {
    return this.filesService.setPrimarySongFile(userId, organizationId, songId, songFileId);
  }

  async reorderSongFiles(userId: string, organizationId: string, songId: string, input: Record<string, unknown>) {
    return this.filesService.reorderSongFiles(userId, organizationId, songId, input);
  }

  async songFileAsset(userId: string, organizationId: string, songId: string, songFileId: string) {
    return this.filesService.songFileAsset(userId, organizationId, songId, songFileId);
  }

  async downloadSongFileName(userId: string, organizationId: string, songId: string, songFileId: string) {
    return this.filesService.downloadSongFileName(userId, organizationId, songId, songFileId);
  }

  async songFileStream(storageKey: string) {
    return this.filesService.songFileStream(storageKey);
  }

  async create(userId: string, organizationId: string, input: Record<string, unknown>) {
    await this.permissions.assertPermission(userId, organizationId, 'songs.manage');
    const parsed = songSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const song = parsed.data;
    const youtubeLinkInput = song.youtubeUrl ? buildYoutubeLinkCreateInput(song.youtubeUrl, userId) : undefined;

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
    return this.versionsService.createVersion(userId, organizationId, songId, input);
  }

  async updateVersion(userId: string, organizationId: string, songId: string, versionId: string, input: Record<string, unknown>) {
    return this.versionsService.updateVersion(userId, organizationId, songId, versionId, input);
  }

  async setDefaultVersion(userId: string, organizationId: string, songId: string, versionId: string) {
    return this.versionsService.setDefaultVersion(userId, organizationId, songId, versionId);
  }

  async deleteVersion(userId: string, organizationId: string, songId: string, versionId: string) {
    return this.versionsService.deleteVersion(userId, organizationId, songId, versionId);
  }

  async links(userId: string, organizationId: string, songId: string, query: Record<string, unknown> = {}) {
    return this.linksService.links(userId, organizationId, songId, query);
  }

  async link(userId: string, organizationId: string, songId: string, linkId: string) {
    return this.linksService.link(userId, organizationId, songId, linkId);
  }

  async createLink(userId: string, organizationId: string, songId: string, input: Record<string, unknown>) {
    return this.linksService.createLink(userId, organizationId, songId, input);
  }

  async updateLink(userId: string, organizationId: string, songId: string, linkId: string, input: Record<string, unknown>) {
    return this.linksService.updateLink(userId, organizationId, songId, linkId, input);
  }

  async deleteLink(userId: string, organizationId: string, songId: string, linkId: string) {
    return this.linksService.deleteLink(userId, organizationId, songId, linkId);
  }

  async setPrimaryLink(userId: string, organizationId: string, songId: string, linkId: string) {
    return this.linksService.setPrimaryLink(userId, organizationId, songId, linkId);
  }

  async reorderLinks(userId: string, organizationId: string, songId: string, input: Record<string, unknown>) {
    return this.linksService.reorderLinks(userId, organizationId, songId, input);
  }

  async createTrack(userId: string, organizationId: string, songId: string, input: Record<string, unknown>) {
    return this.tracksService.createTrack(userId, organizationId, songId, input);
  }

  async uploadTrack(userId: string, organizationId: string, songId: string, input: Record<string, unknown>, file?: UploadedBinary) {
    return this.tracksService.uploadTrack(userId, organizationId, songId, input, file);
  }

  async updateTrack(userId: string, organizationId: string, songId: string, trackId: string, input: Record<string, unknown>) {
    return this.tracksService.updateTrack(userId, organizationId, songId, trackId, input);
  }

  async deleteTrack(userId: string, organizationId: string, songId: string, trackId: string) {
    return this.tracksService.deleteTrack(userId, organizationId, songId, trackId);
  }

  async setPrimaryTrack(userId: string, organizationId: string, songId: string, trackId: string) {
    return this.tracksService.setPrimaryTrack(userId, organizationId, songId, trackId);
  }

  async reorderTracks(userId: string, organizationId: string, songId: string, input: Record<string, unknown>) {
    return this.tracksService.reorderTracks(userId, organizationId, songId, input);
  }

  async copyTrackReferences(userId: string, organizationId: string, songId: string, input: Record<string, unknown>) {
    return this.tracksService.copyTrackReferences(userId, organizationId, songId, input);
  }

  async trackAsset(userId: string, organizationId: string, songId: string, trackId: string) {
    return this.tracksService.trackAsset(userId, organizationId, songId, trackId);
  }

  async downloadFileName(userId: string, organizationId: string, songId: string, trackId: string) {
    return this.tracksService.downloadFileName(userId, organizationId, songId, trackId);
  }

  async storageStream(storageKey: string) {
    return this.tracksService.storageStream(storageKey);
  }
}
