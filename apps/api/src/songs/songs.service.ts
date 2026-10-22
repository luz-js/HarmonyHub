import { BadRequestException, Inject, Injectable } from '@nestjs/common';
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
import type { OrgMember } from '../permissions/current-membership.decorator';

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
    @Inject(SongActivityService) private readonly activity: SongActivityService,
    @Inject(SongRevisionsService) private readonly revisions: SongRevisionsService,
    @Inject(SongsAccessService) private readonly access: SongsAccessService,
    @Inject(SongsVersionsService) private readonly versionsService: SongsVersionsService,
    @Inject(SongsLinksService) private readonly linksService: SongsLinksService,
    @Inject(SongsTracksService) private readonly tracksService: SongsTracksService,
    @Inject(SongsFilesService) private readonly filesService: SongsFilesService,
  ) {}

  async list(member: OrgMember, query: Record<string, unknown>) {
    const { organizationId } = member;
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

  async detail(member: OrgMember, id: string) {
    const { organizationId } = member;
    const song = await this.access.assertSongDetailInOrganization(organizationId, id);
    return {
      ...song,
      tracks: song.tracks.map((track) => normalizeTrackResponse(track)),
      activeVersion: song.versions.find((version) => version.isDefault) || song.versions[0] || null,
    };
  }

  async versions(member: OrgMember, songId: string) {
    return this.versionsService.versions(member, songId);
  }

  async version(member: OrgMember, songId: string, versionId: string) {
    return this.versionsService.version(member, songId, versionId);
  }

  async tracks(member: OrgMember, songId: string, query: Record<string, unknown>) {
    return this.tracksService.tracks(member, songId, query);
  }

  async track(member: OrgMember, songId: string, trackId: string) {
    return this.tracksService.track(member, songId, trackId);
  }

  async files(member: OrgMember, songId: string, query: Record<string, unknown> = {}) {
    return this.filesService.files(member, songId, query);
  }

  async file(member: OrgMember, songId: string, songFileId: string) {
    return this.filesService.file(member, songId, songFileId);
  }

  async uploadSongFile(member: OrgMember, songId: string, input: Record<string, unknown>, file?: UploadedBinary) {
    return this.filesService.uploadSongFile(member, songId, input, file);
  }

  async updateSongFile(member: OrgMember, songId: string, songFileId: string, input: Record<string, unknown>) {
    return this.filesService.updateSongFile(member, songId, songFileId, input);
  }

  async deleteSongFile(member: OrgMember, songId: string, songFileId: string) {
    return this.filesService.deleteSongFile(member, songId, songFileId);
  }

  async setPrimarySongFile(member: OrgMember, songId: string, songFileId: string) {
    return this.filesService.setPrimarySongFile(member, songId, songFileId);
  }

  async reorderSongFiles(member: OrgMember, songId: string, input: Record<string, unknown>) {
    return this.filesService.reorderSongFiles(member, songId, input);
  }

  async songFileAsset(member: OrgMember, songId: string, songFileId: string) {
    return this.filesService.songFileAsset(member, songId, songFileId);
  }

  async downloadSongFileName(member: OrgMember, songId: string, songFileId: string) {
    return this.filesService.downloadSongFileName(member, songId, songFileId);
  }

  async songFileStream(storageKey: string) {
    return this.filesService.songFileStream(storageKey);
  }

  async create(member: OrgMember, input: Record<string, unknown>) {
    const { userId, organizationId } = member;
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

  async update(member: OrgMember, id: string, input: Record<string, unknown>) {
    const { userId, organizationId } = member;
    const existing = await this.detail(member, id);
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

  async archive(member: OrgMember, id: string) {
    const { userId, organizationId } = member;
    const existing = await this.detail(member, id);
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

  async createVersion(member: OrgMember, songId: string, input: Record<string, unknown>) {
    return this.versionsService.createVersion(member, songId, input);
  }

  async updateVersion(member: OrgMember, songId: string, versionId: string, input: Record<string, unknown>) {
    return this.versionsService.updateVersion(member, songId, versionId, input);
  }

  async setDefaultVersion(member: OrgMember, songId: string, versionId: string) {
    return this.versionsService.setDefaultVersion(member, songId, versionId);
  }

  async deleteVersion(member: OrgMember, songId: string, versionId: string) {
    return this.versionsService.deleteVersion(member, songId, versionId);
  }

  async links(member: OrgMember, songId: string, query: Record<string, unknown> = {}) {
    return this.linksService.links(member, songId, query);
  }

  async link(member: OrgMember, songId: string, linkId: string) {
    return this.linksService.link(member, songId, linkId);
  }

  async createLink(member: OrgMember, songId: string, input: Record<string, unknown>) {
    return this.linksService.createLink(member, songId, input);
  }

  async updateLink(member: OrgMember, songId: string, linkId: string, input: Record<string, unknown>) {
    return this.linksService.updateLink(member, songId, linkId, input);
  }

  async deleteLink(member: OrgMember, songId: string, linkId: string) {
    return this.linksService.deleteLink(member, songId, linkId);
  }

  async setPrimaryLink(member: OrgMember, songId: string, linkId: string) {
    return this.linksService.setPrimaryLink(member, songId, linkId);
  }

  async reorderLinks(member: OrgMember, songId: string, input: Record<string, unknown>) {
    return this.linksService.reorderLinks(member, songId, input);
  }

  async createTrack(member: OrgMember, songId: string, input: Record<string, unknown>) {
    return this.tracksService.createTrack(member, songId, input);
  }

  async uploadTrack(member: OrgMember, songId: string, input: Record<string, unknown>, file?: UploadedBinary) {
    return this.tracksService.uploadTrack(member, songId, input, file);
  }

  async updateTrack(member: OrgMember, songId: string, trackId: string, input: Record<string, unknown>) {
    return this.tracksService.updateTrack(member, songId, trackId, input);
  }

  async deleteTrack(member: OrgMember, songId: string, trackId: string) {
    return this.tracksService.deleteTrack(member, songId, trackId);
  }

  async setPrimaryTrack(member: OrgMember, songId: string, trackId: string) {
    return this.tracksService.setPrimaryTrack(member, songId, trackId);
  }

  async reorderTracks(member: OrgMember, songId: string, input: Record<string, unknown>) {
    return this.tracksService.reorderTracks(member, songId, input);
  }

  async copyTrackReferences(member: OrgMember, songId: string, input: Record<string, unknown>) {
    return this.tracksService.copyTrackReferences(member, songId, input);
  }

  async trackAsset(member: OrgMember, songId: string, trackId: string) {
    return this.tracksService.trackAsset(member, songId, trackId);
  }

  async downloadFileName(member: OrgMember, songId: string, trackId: string) {
    return this.tracksService.downloadFileName(member, songId, trackId);
  }

  async storageStream(storageKey: string) {
    return this.tracksService.storageStream(storageKey);
  }
}
