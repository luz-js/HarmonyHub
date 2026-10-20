import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { clean } from '../shared/object.utils';
import { SongActivityService } from './activity/song-activity.service';
import { SongsAccessService } from './songs-access.service';
import {
  buildInternalTrackUrl,
  normalizeTrackResponse,
  sanitizeDownloadFileName,
} from './songs.presenter';
import { SongsRepository } from './songs.repository';
import {
  buildTrackStorageSegments,
  copyTracksSchema,
  createTrackSchema,
  listTrackQuerySchema,
  reorderTrackSchema,
  trackUploadBodySchema,
  updateTrackSchema,
  validateAudioUploadFile,
} from './songs.schemas';
import { TRACK_STORAGE, TrackStorageProvider } from './storage/track-storage.interface';

type UploadedTrackFile = {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
};

@Injectable()
export class SongsTracksService {
  constructor(
    @Inject(SongsRepository) private readonly songsRepository: SongsRepository,
    @Inject(SongsAccessService) private readonly access: SongsAccessService,
    @Inject(TRACK_STORAGE) private readonly trackStorage: TrackStorageProvider,
    @Inject(SongActivityService) private readonly activity: SongActivityService,
  ) {}

  async tracks(userId: string, organizationId: string, songId: string, query: Record<string, unknown>) {
    await this.access.assertSongInOrganization(userId, organizationId, songId);
    const parsed = listTrackQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const versionId = parsed.data.versionId ? parsed.data.versionId : undefined;
    if (versionId) await this.access.assertVersionInSong(songId, versionId);
    const tracks = await this.songsRepository.listTracks(songId, { versionId, includeGeneral: parsed.data.includeGeneral });
    return tracks.map((track) => normalizeTrackResponse(track));
  }

  async track(userId: string, organizationId: string, songId: string, trackId: string) {
    await this.access.assertSongInOrganization(userId, organizationId, songId);
    const track = await this.access.assertTrackInSong(songId, trackId);
    return normalizeTrackResponse(track);
  }

  async createTrack(userId: string, organizationId: string, songId: string, input: Record<string, unknown>) {
    await this.access.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    const parsed = createTrackSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const version = await this.access.assertVersionInSong(songId, parsed.data.versionId);
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
    return normalizeTrackResponse(created);
  }

  async uploadTrack(userId: string, organizationId: string, songId: string, input: Record<string, unknown>, file?: UploadedTrackFile) {
    await this.access.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    if (!file) throw new BadRequestException('Archivo requerido');
    validateAudioUploadFile(file);

    const parsed = trackUploadBodySchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    const version = await this.access.assertVersionInSong(songId, parsed.data.versionId);
    const trackId = `track_${randomUUID().replace(/-/g, '')}`;
    const storage = await this.trackStorage.upload(
      file.buffer,
      buildTrackStorageSegments(organizationId, songId, trackId, version?.id),
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
      return normalizeTrackResponse(created);
    } catch (error) {
      await this.trackStorage.delete(storage.storageKey);
      throw error;
    }
  }

  async updateTrack(userId: string, organizationId: string, songId: string, trackId: string, input: Record<string, unknown>) {
    await this.access.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    const existing = await this.access.assertTrackInSong(songId, trackId);
    const parsed = updateTrackSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const version = parsed.data.versionId === undefined
      ? await this.access.assertVersionInSong(songId, existing.versionId)
      : await this.access.assertVersionInSong(songId, parsed.data.versionId);
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
    return normalizeTrackResponse(updated);
  }

  async deleteTrack(userId: string, organizationId: string, songId: string, trackId: string) {
    await this.access.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    const track = await this.access.assertTrackInSong(songId, trackId);
    if (track.storageKey && track.provider !== 'EXTERNAL_URL' && track.provider !== 'OTHER') {
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
    await this.access.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    await this.access.assertTrackInSong(songId, trackId);
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
    return normalizeTrackResponse(track);
  }

  async reorderTracks(userId: string, organizationId: string, songId: string, input: Record<string, unknown>) {
    await this.access.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    const parsed = reorderTrackSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const version = await this.access.assertVersionInSong(songId, parsed.data.versionId);
    const tracks = await this.songsRepository.reorderTracks(songId, version?.id || null, parsed.data.items);
    return tracks.map((track) => normalizeTrackResponse(track));
  }

  async copyTrackReferences(userId: string, organizationId: string, songId: string, input: Record<string, unknown>) {
    await this.access.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    const parsed = copyTracksSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    if (parsed.data.sourceVersionId === parsed.data.targetVersionId) {
      throw new BadRequestException('El origen y el destino deben ser versiones distintas');
    }

    const source = await this.access.assertVersionInSong(songId, parsed.data.sourceVersionId);
    const target = await this.access.assertVersionInSong(songId, parsed.data.targetVersionId);
    if (!source || !target) throw new BadRequestException('Version invalida');

    const created = await this.songsRepository.copyTrackReferences({
      songId,
      sourceVersionId: source.id,
      targetVersionId: target.id,
      uploadedById: userId,
      buildInternalUrl: (trackReferenceId: string) => buildInternalTrackUrl(songId, trackReferenceId),
      makeTrackId: () => `track_${randomUUID().replace(/-/g, '')}`,
    });

    return { copied: created.length, tracks: created.map((track) => normalizeTrackResponse(track)) };
  }

  async trackAsset(userId: string, organizationId: string, songId: string, trackId: string) {
    await this.access.assertSongInOrganization(userId, organizationId, songId);
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
