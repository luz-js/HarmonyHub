import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  trackUploadBodySchema,
  type CopySongTracksData,
  type CreateSongTrackData,
  type ReorderSongTracksData,
  type SongTrackListQueryData,
  type UpdateSongTrackData,
} from '@harmonyhub/contracts';
import { parseOrBadRequest } from '../../shared/zod.pipe';
import { clean } from '../../shared/object.utils';
import { SongActivityService } from '../activity/song-activity.service';
import { SongsAccessService } from '../songs-access.service';
import {
  buildInternalTrackUrl,
  normalizeTrackResponse,
  sanitizeDownloadFileName,
} from '../songs.presenter';
import { SongTracksRepository } from './song-tracks.repository';
import { buildTrackStorageSegments, validateAudioUploadFile } from '../songs.schemas';
import { TRACK_STORAGE, TrackStorageProvider } from '../storage/track-storage.interface';
import type { OrgMember } from '../../permissions/current-membership.decorator';

type UploadedTrackFile = {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
};

@Injectable()
export class SongTracksService {
  constructor(
    @Inject(SongTracksRepository) private readonly tracksRepository: SongTracksRepository,
    @Inject(SongsAccessService) private readonly access: SongsAccessService,
    @Inject(TRACK_STORAGE) private readonly trackStorage: TrackStorageProvider,
    @Inject(SongActivityService) private readonly activity: SongActivityService,
  ) {}

  async tracks(member: OrgMember, songId: string, query: SongTrackListQueryData) {
    const { organizationId } = member;
    await this.access.assertSongInOrganization(organizationId, songId);
    const versionId = query.versionId ? query.versionId : undefined;
    if (versionId) await this.access.assertVersionInSong(songId, versionId);
    const tracks = await this.tracksRepository.listTracks(songId, { versionId, includeGeneral: query.includeGeneral });
    return tracks.map((track) => normalizeTrackResponse(track));
  }

  async track(member: OrgMember, songId: string, trackId: string) {
    const { organizationId } = member;
    await this.access.assertSongInOrganization(organizationId, songId);
    const track = await this.access.assertTrackInSong(songId, trackId);
    return normalizeTrackResponse(track);
  }

  async createTrack(member: OrgMember, songId: string, data: CreateSongTrackData) {
    const { userId, organizationId } = member;
    await this.access.assertSongInOrganization(organizationId, songId);
    const version = await this.access.assertVersionInSong(songId, data.versionId);
    const sortOrder = data.sortOrder ?? await this.tracksRepository.nextTrackSortOrder(songId, version?.id || null);
    const provider = data.provider ?? 'EXTERNAL_URL';
    const created = await this.tracksRepository.createTrack({
      songId,
      versionId: version?.id,
      name: data.name,
      type: data.type,
      instrument: data.instrument,
      durationSec: data.durationSec,
      url: data.url,
      provider,
      volumeDefault: data.volumeDefault ?? 1,
      panDefault: data.panDefault ?? 0,
      isPrimary: data.isPrimary,
      sortOrder,
      active: data.active ?? true,
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

  async uploadTrack(member: OrgMember, songId: string, input: Record<string, unknown>, file?: UploadedTrackFile) {
    const { userId, organizationId } = member;
    await this.access.assertSongInOrganization(organizationId, songId);
    if (!file) throw new BadRequestException('Archivo requerido');
    validateAudioUploadFile(file);

    // Se valida aqui y no con ZodPipe: es un formulario multipart y primero se revisa el archivo.
    const data = parseOrBadRequest(trackUploadBodySchema, input);

    const version = await this.access.assertVersionInSong(songId, data.versionId);
    const trackId = `track_${randomUUID().replace(/-/g, '')}`;
    const storage = await this.trackStorage.upload(
      file.buffer,
      buildTrackStorageSegments(organizationId, songId, trackId, version?.id),
      file.originalname,
      file.mimetype,
    );

    try {
      const sortOrder = await this.tracksRepository.nextTrackSortOrder(songId, version?.id || null);
      const created = await this.tracksRepository.createTrack({
        id: trackId,
        songId,
        versionId: version?.id,
        uploadedById: userId,
        name: data.name || file.originalname.replace(/\.[^.]+$/, ''),
        type: data.type,
        instrument: data.instrument,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        durationSec: data.durationSec,
        originalFileName: file.originalname,
        storageKey: storage.storageKey,
        url: buildInternalTrackUrl(songId, trackId),
        provider: 'UPLOAD',
        volumeDefault: 1,
        panDefault: 0,
        isPrimary: data.isPrimary ?? sortOrder === 0,
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

  async updateTrack(member: OrgMember, songId: string, trackId: string, data: UpdateSongTrackData) {
    const { organizationId } = member;
    await this.access.assertSongInOrganization(organizationId, songId);
    const existing = await this.access.assertTrackInSong(songId, trackId);
    const version = data.versionId === undefined
      ? await this.access.assertVersionInSong(songId, existing.versionId)
      : await this.access.assertVersionInSong(songId, data.versionId);
    const provider = data.provider ?? existing.provider;

    if ((provider === 'EXTERNAL_URL' || provider === 'OTHER') && data.url !== undefined && data.url === null) {
      throw new BadRequestException('La URL externa no puede quedar vacia');
    }

    const updated = await this.tracksRepository.updateTrack(trackId, clean({
      versionId: data.versionId === undefined ? undefined : version?.id ?? null,
      name: data.name,
      type: data.type,
      instrument: data.instrument,
      durationSec: data.durationSec,
      url: data.url,
      provider: data.provider,
      volumeDefault: data.volumeDefault,
      panDefault: data.panDefault,
      isPrimary: data.isPrimary,
      sortOrder: data.sortOrder,
      active: data.active,
    }));
    return normalizeTrackResponse(updated);
  }

  async deleteTrack(member: OrgMember, songId: string, trackId: string) {
    const { userId, organizationId } = member;
    await this.access.assertSongInOrganization(organizationId, songId);
    const track = await this.access.assertTrackInSong(songId, trackId);
    if (track.storageKey && track.provider !== 'EXTERNAL_URL' && track.provider !== 'OTHER') {
      const otherReferences = await this.tracksRepository.countTracksByStorageKey(track.storageKey, trackId);
      if (otherReferences === 0) {
        await this.trackStorage.delete(track.storageKey);
      }
    }
    await this.tracksRepository.deleteTrack(trackId);
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

  async setPrimaryTrack(member: OrgMember, songId: string, trackId: string) {
    const { userId, organizationId } = member;
    await this.access.assertSongInOrganization(organizationId, songId);
    await this.access.assertTrackInSong(songId, trackId);
    const track = await this.tracksRepository.setTrackPrimary(songId, trackId);
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

  async reorderTracks(member: OrgMember, songId: string, data: ReorderSongTracksData) {
    const { organizationId } = member;
    await this.access.assertSongInOrganization(organizationId, songId);
    const version = await this.access.assertVersionInSong(songId, data.versionId);
    const tracks = await this.tracksRepository.reorderTracks(songId, version?.id || null, data.items);
    return tracks.map((track) => normalizeTrackResponse(track));
  }

  async copyTrackReferences(member: OrgMember, songId: string, data: CopySongTracksData) {
    const { userId, organizationId } = member;
    await this.access.assertSongInOrganization(organizationId, songId);

    if (data.sourceVersionId === data.targetVersionId) {
      throw new BadRequestException('El origen y el destino deben ser versiones distintas');
    }

    const source = await this.access.assertVersionInSong(songId, data.sourceVersionId);
    const target = await this.access.assertVersionInSong(songId, data.targetVersionId);
    if (!source || !target) throw new BadRequestException('Version invalida');

    const created = await this.tracksRepository.copyTrackReferences({
      songId,
      sourceVersionId: source.id,
      targetVersionId: target.id,
      uploadedById: userId,
      buildInternalUrl: (trackReferenceId: string) => buildInternalTrackUrl(songId, trackReferenceId),
      makeTrackId: () => `track_${randomUUID().replace(/-/g, '')}`,
    });

    return { copied: created.length, tracks: created.map((track) => normalizeTrackResponse(track)) };
  }

  async trackAsset(member: OrgMember, songId: string, trackId: string) {
    const { organizationId } = member;
    await this.access.assertSongInOrganization(organizationId, songId);
    return this.tracksRepository.songTrackFileContext(songId, trackId);
  }

  async downloadFileName(member: OrgMember, songId: string, trackId: string) {
    const track = await this.trackAsset(member, songId, trackId);
    const extension = extname(track.originalFileName || track.url || track.name) || '.mp3';
    return `${sanitizeDownloadFileName(track.song.title)} - ${sanitizeDownloadFileName(track.name)}${extension.toLowerCase()}`;
  }

  async storageStream(storageKey: string) {
    const exists = await this.trackStorage.exists(storageKey);
    if (!exists) throw new NotFoundException('Archivo no encontrado');
    return await this.trackStorage.createReadStream(storageKey);
  }
}
