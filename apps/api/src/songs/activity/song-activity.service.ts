import { Inject, Injectable, Logger } from '@nestjs/common';
import type { SongActivityListQueryData } from '@harmonyhub/contracts';
import { Prisma, SongActivityType, SongEntityType } from '@prisma/client';
import { clean } from '../../shared/object.utils';
import { assertSongAccess } from '../song-access.utils';
import { SongsRepository } from '../songs.repository';
import { SongActivityRepository } from './song-activity.repository';
import type { OrgMember } from '../../permissions/current-membership.decorator';

export type RecordSongActivityParams = {
  songId: string;
  versionId?: string | null;
  organizationId: string;
  actorId?: string | null;
  action: SongActivityType;
  entityType: SongEntityType;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown> | null;
};

@Injectable()
export class SongActivityService {
  private readonly logger = new Logger(SongActivityService.name);

  constructor(
    @Inject(SongActivityRepository) private readonly activityRepository: SongActivityRepository,
    @Inject(SongsRepository) private readonly songsRepository: SongsRepository,
  ) {}

  /** Uso critico: dentro de la misma transaccion del cambio principal (p.ej. creacion de version). */
  record(params: RecordSongActivityParams, client?: Prisma.TransactionClient) {
    return this.activityRepository.create({
      songId: params.songId,
      versionId: params.versionId ?? null,
      organizationId: params.organizationId,
      actorId: params.actorId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      summary: params.summary,
      metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    }, client);
  }

  /** Uso no critico: nunca revierte la operacion principal si falla el registro de actividad. */
  async recordBestEffort(params: RecordSongActivityParams) {
    try {
      await this.record(params);
    } catch (error: any) {
      this.logger.warn(`No se pudo registrar actividad ${params.action} para song ${params.songId}: ${error?.message || error}`);
    }
  }

  async list(member: OrgMember, songId: string, query: SongActivityListQueryData) {
    const { organizationId } = member;
    await assertSongAccess(this.songsRepository, organizationId, songId);

    const createdAtFilter = clean({
      gte: query.from ? new Date(query.from) : undefined,
      lte: query.to ? new Date(query.to) : undefined,
    });

    const where: Prisma.SongActivityWhereInput = clean({
      action: query.action,
      entityType: query.entityType,
      versionId: query.versionId,
      createdAt: Object.keys(createdAtFilter).length > 0 ? createdAtFilter : undefined,
    });

    const skip = (query.page - 1) * query.pageSize;
    const { items, total } = await this.activityRepository.list(songId, where, skip, query.pageSize);

    return {
      items: items.map((item) => ({
        id: item.id,
        songId: item.songId,
        versionId: item.versionId,
        action: item.action,
        entityType: item.entityType,
        entityId: item.entityId,
        summary: item.summary,
        metadata: item.metadata,
        actor: item.actor ?? null,
        version: item.version ?? null,
        createdAt: item.createdAt,
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }
}
