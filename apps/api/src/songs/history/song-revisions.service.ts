import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RevisionSource } from '@prisma/client';
import { z } from 'zod';
import { assertSongAccess, assertSongVersionAccess } from '../song-access.utils';
import { SongsRepository } from '../songs.repository';
import { SongActivityService } from '../activity/song-activity.service';
import { calculateSongVersionRevisionHash, diffSongVersionRevisions, SongVersionRevisionSnapshot } from './song-revision.utils';
import { SongRevisionsRepository } from './song-revisions.repository';
import type { OrgMember } from '../../permissions/current-membership.decorator';

const restoreSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

type VersionSnapshotRow = {
  name: string;
  key: string | null;
  bpm: number | null;
  durationSec: number | null;
  contentJson: unknown;
  structureJson: unknown;
  lyrics: string | null;
  chords: string | null;
  notes: string | null;
};

function toSnapshot(version: VersionSnapshotRow): SongVersionRevisionSnapshot {
  return {
    name: version.name,
    key: version.key,
    bpm: version.bpm,
    durationSec: version.durationSec,
    contentJson: version.contentJson,
    structureJson: version.structureJson,
    lyrics: version.lyrics,
    chords: version.chords,
    notes: version.notes,
  };
}

function toJsonInput(value: unknown) {
  if (value === null || value === undefined) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

@Injectable()
export class SongRevisionsService {
  constructor(
    @Inject(SongsRepository) private readonly songsRepository: SongsRepository,
    @Inject(SongRevisionsRepository) private readonly revisionsRepository: SongRevisionsRepository,
    @Inject(SongActivityService) private readonly activity: SongActivityService,
  ) {}

  private normalize(revision: {
    id: string;
    songId: string;
    versionId: string;
    revisionNumber: number;
    reason: string | null;
    source: RevisionSource;
    name: string;
    key: string | null;
    bpm: number | null;
    durationSec: number | null;
    contentJson: unknown;
    structureJson: unknown;
    lyrics: string | null;
    chords: string | null;
    notes: string | null;
    createdBy?: { id: string; name: string; avatarUrl: string | null } | null;
    createdAt: Date;
  }) {
    return {
      id: revision.id,
      songId: revision.songId,
      versionId: revision.versionId,
      revisionNumber: revision.revisionNumber,
      reason: revision.reason,
      source: revision.source,
      name: revision.name,
      key: revision.key,
      bpm: revision.bpm,
      durationSec: revision.durationSec,
      contentJson: revision.contentJson,
      structureJson: revision.structureJson,
      lyrics: revision.lyrics,
      chords: revision.chords,
      notes: revision.notes,
      createdBy: revision.createdBy ?? null,
      createdAt: revision.createdAt,
    };
  }

  /**
   * Punto de entrada usado por SongsService al crear/actualizar una version.
   * Crea una revision solo si el contenido musical realmente cambio (dedup por hash).
   */
  async ensureRevisionForVersionChange(params: {
    songId: string;
    versionId: string;
    organizationId: string;
    actorId: string | null;
    source: RevisionSource;
    reason?: string | null;
    snapshot: SongVersionRevisionSnapshot;
  }) {
    const latest = await this.revisionsRepository.findLatest(params.versionId);
    const hash = calculateSongVersionRevisionHash(params.snapshot);
    if (latest && latest.contentHash === hash) return null;
    return this.createRevision(params, hash);
  }

  private createRevision(
    params: { songId: string; versionId: string; organizationId: string; actorId: string | null; source: RevisionSource; reason?: string | null; snapshot: SongVersionRevisionSnapshot },
    hash: string,
  ) {
    return this.revisionsRepository.create({
      songId: params.songId,
      versionId: params.versionId,
      organizationId: params.organizationId,
      createdById: params.actorId,
      reason: params.reason,
      source: params.source,
      contentHash: hash,
      name: params.snapshot.name,
      key: params.snapshot.key,
      bpm: params.snapshot.bpm,
      durationSec: params.snapshot.durationSec,
      contentJson: toJsonInput(params.snapshot.contentJson),
      structureJson: toJsonInput(params.snapshot.structureJson),
      lyrics: params.snapshot.lyrics,
      chords: params.snapshot.chords,
      notes: params.snapshot.notes,
    });
  }

  /** Backfill perezoso e idempotente: solo crea la revision inicial si la version todavia no tiene ninguna. */
  private async ensureInitialRevision(songId: string, versionId: string, organizationId: string) {
    const count = await this.revisionsRepository.countByVersion(versionId);
    if (count > 0) return;
    const version = await this.revisionsRepository.findVersionSnapshot(versionId);
    if (!version) return;
    await this.ensureRevisionForVersionChange({
      songId,
      versionId,
      organizationId,
      actorId: null,
      source: 'MIGRATION',
      reason: 'Revision inicial generada automaticamente',
      snapshot: toSnapshot(version),
    });
  }

  async list(member: OrgMember, songId: string, versionId: string) {
    const { organizationId } = member;
    await assertSongAccess(this.songsRepository, organizationId, songId);
    await assertSongVersionAccess(this.songsRepository, songId, versionId);
    await this.ensureInitialRevision(songId, versionId, organizationId);
    const revisions = await this.revisionsRepository.list(versionId);
    return revisions.map((revision) => this.normalize(revision));
  }

  async get(member: OrgMember, songId: string, versionId: string, revisionNumber: number) {
    const { organizationId } = member;
    await assertSongAccess(this.songsRepository, organizationId, songId);
    await assertSongVersionAccess(this.songsRepository, songId, versionId);
    await this.ensureInitialRevision(songId, versionId, organizationId);
    const revision = await this.revisionsRepository.findByNumber(versionId, revisionNumber);
    if (!revision) throw new NotFoundException('Revision no encontrada');
    return this.normalize(revision);
  }

  async diff(member: OrgMember, songId: string, versionId: string, revisionNumber: number, compareToRevisionNumber?: number) {
    const { organizationId } = member;
    await assertSongAccess(this.songsRepository, organizationId, songId);
    await assertSongVersionAccess(this.songsRepository, songId, versionId);
    await this.ensureInitialRevision(songId, versionId, organizationId);

    const revision = await this.revisionsRepository.findByNumber(versionId, revisionNumber);
    if (!revision) throw new NotFoundException('Revision no encontrada');

    let afterSnapshot: SongVersionRevisionSnapshot;
    let afterLabel: string;
    if (compareToRevisionNumber !== undefined) {
      const compareTo = await this.revisionsRepository.findByNumber(versionId, compareToRevisionNumber);
      if (!compareTo) throw new NotFoundException('Revision de comparacion no encontrada');
      afterSnapshot = toSnapshot(compareTo);
      afterLabel = `revision-${compareTo.revisionNumber}`;
    } else {
      const current = await this.revisionsRepository.findVersionSnapshot(versionId);
      if (!current) throw new NotFoundException('Version no encontrada');
      afterSnapshot = toSnapshot(current);
      afterLabel = 'current';
    }

    return {
      before: { revisionNumber: revision.revisionNumber, label: `revision-${revision.revisionNumber}` },
      after: { revisionNumber: compareToRevisionNumber ?? null, label: afterLabel },
      diff: diffSongVersionRevisions(toSnapshot(revision), afterSnapshot),
    };
  }

  async restore(member: OrgMember, songId: string, versionId: string, revisionNumber: number, input: Record<string, unknown>) {
    const { userId, organizationId } = member;
    const song = await this.songsRepository.findSongSummaryInOrganization(songId, organizationId);
    if (!song) throw new NotFoundException('Cancion no encontrada');
    await assertSongVersionAccess(this.songsRepository, songId, versionId);

    const parsed = restoreSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    const target = await this.revisionsRepository.findByNumber(versionId, revisionNumber);
    if (!target) throw new NotFoundException('Revision no encontrada');

    const current = await this.revisionsRepository.findVersionSnapshot(versionId);
    if (!current) throw new NotFoundException('Version no encontrada');

    // 1) Preservar el estado actual como revision, solo si difiere de la ultima registrada.
    await this.ensureRevisionForVersionChange({
      songId,
      versionId,
      organizationId,
      actorId: userId,
      source: 'MANUAL_SAVE',
      reason: 'Estado previo a restauracion',
      snapshot: toSnapshot(current),
    });

    // 2) Aplicar el snapshot restaurado a la version (append-only: nunca se borra historial).
    const restoredSnapshot = toSnapshot(target);
    await this.songsRepository.updateVersion(versionId, {
      name: restoredSnapshot.name,
      key: restoredSnapshot.key ?? undefined,
      bpm: restoredSnapshot.bpm,
      durationSec: restoredSnapshot.durationSec,
      contentJson: toJsonInput(restoredSnapshot.contentJson),
      structureJson: toJsonInput(restoredSnapshot.structureJson),
      lyrics: restoredSnapshot.lyrics,
      chords: restoredSnapshot.chords,
      notes: restoredSnapshot.notes,
    });

    // 3) Registrar la restauracion como una nueva revision explicita (no se deduplica: es una accion deliberada).
    const reason = parsed.data.reason || `Restaurado desde revision ${revisionNumber}`;
    const restoredRevision = await this.createRevision(
      { songId, versionId, organizationId, actorId: userId, source: 'RESTORE', reason, snapshot: restoredSnapshot },
      calculateSongVersionRevisionHash(restoredSnapshot),
    );

    await this.activity.recordBestEffort({
      songId,
      versionId,
      organizationId,
      actorId: userId,
      action: 'VERSION_RESTORED',
      entityType: 'VERSION',
      entityId: versionId,
      summary: `Restauró la revisión ${revisionNumber}`,
      metadata: { revisionNumber },
    });

    return this.normalize(restoredRevision);
  }
}
