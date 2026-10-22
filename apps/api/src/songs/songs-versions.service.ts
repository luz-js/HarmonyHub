import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateSongVersionData, UpdateSongVersionData } from '@harmonyhub/contracts';
import { Prisma } from '@prisma/client';
import { clean } from '../shared/object.utils';
import { SongActivityService } from './activity/song-activity.service';
import { SongRevisionsService } from './history/song-revisions.service';
import { SongsAccessService } from './songs-access.service';
import { SongsRepository } from './songs.repository';
import { SongVersionsRepository } from './versions/song-versions.repository';
import { buildContentJson } from './songs.schemas';
import type { OrgMember } from '../permissions/current-membership.decorator';

@Injectable()
export class SongsVersionsService {
  constructor(
    @Inject(SongsRepository) private readonly songsRepository: SongsRepository,
    @Inject(SongVersionsRepository) private readonly versionsRepository: SongVersionsRepository,
    @Inject(SongActivityService) private readonly activity: SongActivityService,
    @Inject(SongRevisionsService) private readonly revisions: SongRevisionsService,
    @Inject(SongsAccessService) private readonly access: SongsAccessService,
  ) {}

  async versions(member: OrgMember, songId: string) {
    const { organizationId } = member;
    await this.access.assertSongDetailInOrganization(organizationId, songId);
    return this.versionsRepository.listVersions(songId);
  }

  async version(member: OrgMember, songId: string, versionId: string) {
    const { organizationId } = member;
    await this.access.assertSongDetailInOrganization(organizationId, songId);
    const version = await this.songsRepository.findVersion(songId, versionId);
    if (!version) throw new NotFoundException('Version no encontrada');
    return version;
  }

  async createVersion(member: OrgMember, songId: string, version: CreateSongVersionData) {
    const { userId, organizationId } = member;
    await this.access.assertSongDetailInOrganization(organizationId, songId);
    const created = await this.versionsRepository.createVersion({
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

  async updateVersion(member: OrgMember, songId: string, versionId: string, data: UpdateSongVersionData) {
    const { userId, organizationId } = member;
    const before = await this.version(member, songId, versionId);
    const updated = await this.versionsRepository.updateVersion(versionId, clean({
      ...data,
      contentJson: data.contentJson as Prisma.InputJsonValue | undefined,
      structureJson: data.structureJson as Prisma.InputJsonValue | undefined,
    }));

    const keyChanged = data.key !== undefined && data.key !== before.key;
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

  async setDefaultVersion(member: OrgMember, songId: string, versionId: string) {
    const { userId, organizationId } = member;
    const version = await this.version(member, songId, versionId);
    const updated = await this.versionsRepository.setDefaultVersion(songId, versionId);
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

  async deleteVersion(member: OrgMember, songId: string, versionId: string) {
    const { userId, organizationId } = member;
    const version = await this.version(member, songId, versionId);
    let result;
    try {
      result = await this.versionsRepository.deleteVersion(songId, versionId);
    } catch (error: any) {
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
}
