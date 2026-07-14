import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const createdBySelect = { id: true, name: true, avatarUrl: true } satisfies Prisma.UserSelect;

@Injectable()
export class SongRevisionsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  countByVersion(versionId: string) {
    return this.prisma.songVersionRevision.count({ where: { versionId } });
  }

  findVersionSnapshot(versionId: string) {
    return this.prisma.songVersion.findUnique({
      where: { id: versionId },
      select: {
        id: true,
        songId: true,
        name: true,
        key: true,
        bpm: true,
        durationSec: true,
        contentJson: true,
        structureJson: true,
        lyrics: true,
        chords: true,
        notes: true,
      },
    });
  }

  findLatest(versionId: string) {
    return this.prisma.songVersionRevision.findFirst({ where: { versionId }, orderBy: { revisionNumber: 'desc' } });
  }

  create(data: Omit<Prisma.SongVersionRevisionUncheckedCreateInput, 'revisionNumber'>) {
    return this.prisma.$transaction(async (tx) => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const count = await tx.songVersionRevision.count({ where: { versionId: data.versionId as string } });
        try {
          return await tx.songVersionRevision.create({ data: { ...data, revisionNumber: count + 1 } });
        } catch (error) {
          const isUniqueConflict = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
          if (!isUniqueConflict || attempt === 2) throw error;
        }
      }
      throw new Error('No se pudo asignar un numero de revision');
    });
  }

  list(versionId: string) {
    return this.prisma.songVersionRevision.findMany({
      where: { versionId },
      orderBy: { revisionNumber: 'desc' },
      include: { createdBy: { select: createdBySelect } },
    });
  }

  findByNumber(versionId: string, revisionNumber: number) {
    return this.prisma.songVersionRevision.findUnique({
      where: { versionId_revisionNumber: { versionId, revisionNumber } },
      include: { createdBy: { select: createdBySelect } },
    });
  }
}
