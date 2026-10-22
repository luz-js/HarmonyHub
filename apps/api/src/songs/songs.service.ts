import { Inject, Injectable } from '@nestjs/common';
import type { CreateSongData, UpdateSongData } from '@harmonyhub/contracts';
import { clean } from '../shared/object.utils';
import { SongActivityService } from './activity/song-activity.service';
import { SongRevisionsService } from './history/song-revisions.service';
import { SongsAccessService } from './songs-access.service';
import { buildYoutubeLinkCreateInput } from './links/song-links.helpers';
import { normalizeSongSummary, normalizeTrackResponse } from './songs.presenter';
import { SongsRepository } from './songs.repository';
import { buildContentJson, parseTags } from './songs.schemas';
import type { OrgMember } from '../permissions/current-membership.decorator';

@Injectable()
export class SongsService {
  constructor(
    @Inject(SongsRepository) private readonly songsRepository: SongsRepository,
    @Inject(SongActivityService) private readonly activity: SongActivityService,
    @Inject(SongRevisionsService) private readonly revisions: SongRevisionsService,
    @Inject(SongsAccessService) private readonly access: SongsAccessService,
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

  async create(member: OrgMember, song: CreateSongData) {
    const { userId, organizationId } = member;
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

  async update(member: OrgMember, id: string, song: UpdateSongData) {
    const { userId, organizationId } = member;
    const existing = await this.detail(member, id);
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

}
