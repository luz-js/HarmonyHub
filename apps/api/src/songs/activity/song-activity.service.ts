import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma, SongActivityType, SongEntityType } from '@prisma/client';
import { z } from 'zod';
import { PermissionsService } from '../../permissions/permissions.service';
import { clean } from '../../shared/object.utils';
import { assertSongAccess } from '../song-access.utils';
import { SongsRepository } from '../songs.repository';
import { SongActivityRepository } from './song-activity.repository';

const listActivityQuerySchema = z.object({
  action: z.nativeEnum(SongActivityType).optional(),
  entityType: z.nativeEnum(SongEntityType).optional(),
  versionId: z.string().trim().min(1).optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

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
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
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

  async list(userId: string, organizationId: string, songId: string, query: Record<string, unknown> = {}) {
    await assertSongAccess(this.songsRepository, this.permissions, userId, organizationId, songId);
    const parsed = listActivityQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    const createdAtFilter = clean({
      gte: parsed.data.from ? new Date(parsed.data.from) : undefined,
      lte: parsed.data.to ? new Date(parsed.data.to) : undefined,
    });

    const where: Prisma.SongActivityWhereInput = clean({
      action: parsed.data.action,
      entityType: parsed.data.entityType,
      versionId: parsed.data.versionId,
      createdAt: Object.keys(createdAtFilter).length > 0 ? createdAtFilter : undefined,
    });

    const skip = (parsed.data.page - 1) * parsed.data.pageSize;
    const { items, total } = await this.activityRepository.list(songId, where, skip, parsed.data.pageSize);

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
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / parsed.data.pageSize)),
    };
  }
}
