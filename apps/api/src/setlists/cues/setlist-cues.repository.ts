import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SetlistCuePhase, SetlistCueStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { getCueCategory, type CueCategory } from './setlist-cue.utils';

const cueInclude = {
  responsibleParticipant: {
    select: {
      id: true,
      status: true,
      membership: { select: { id: true, instrument: true, user: { select: { id: true, name: true, avatarUrl: true } } } },
    },
  },
  responsibleAssignment: { select: { id: true, role: true, instrument: true } },
  createdBy: { select: { id: true, name: true } },
  completedBy: { select: { id: true, name: true } },
} satisfies Prisma.SetlistCueInclude;

/** Prisma exige `Prisma.DbNull` (no `null` a secas) para escribir NULL en una columna `Json?`. */
export function toNullableJsonInput(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.DbNull;
  return value as Prisma.InputJsonValue;
}

/**
 * Reutilizado por `SetlistItemsRepository.duplicate` cuando `includeCues: true`: copia los cues del item
 * origen al nuevo item dentro de la MISMA transaccion de duplicacion del item. El responsable general
 * (`responsibleParticipantId`) se conserva porque pertenece a todo el setlist; `responsibleAssignmentId`
 * SIEMPRE se descarta porque es especifico del item origen (el nuevo item no tiene asignaciones propias).
 */
export async function copyCuesForItemDuplication(tx: Prisma.TransactionClient, sourceItemId: string, targetItemId: string) {
  const sourceCues = await tx.setlistCue.findMany({ where: { setlistItemId: sourceItemId }, orderBy: [{ phase: 'asc' }, { sortOrder: 'asc' }] });
  const nextOrderByPhase = new Map<SetlistCuePhase, number>();

  for (const cue of sourceCues) {
    let nextOrder = nextOrderByPhase.get(cue.phase);
    if (nextOrder === undefined) {
      nextOrder = await tx.setlistCue.count({ where: { setlistItemId: targetItemId, phase: cue.phase } });
    }
    await tx.setlistCue.create({
      data: {
        setlistId: cue.setlistId,
        setlistItemId: targetItemId,
        type: cue.type,
        phase: cue.phase,
        status: 'PENDING',
        priority: cue.priority,
        title: cue.title,
        description: cue.description,
        offsetSec: cue.offsetSec,
        durationSec: cue.durationSec,
        sortOrder: nextOrder,
        metadata: toNullableJsonInput(cue.metadata),
        isOptional: cue.isOptional,
        isHidden: cue.isHidden,
        responsibleParticipantId: cue.responsibleParticipantId,
        responsibleAssignmentId: null,
        createdById: cue.createdById,
      },
    });
    nextOrderByPhase.set(cue.phase, nextOrder + 1);
  }
}

@Injectable()
export class SetlistCuesRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listBySetlist(setlistId: string) {
    return this.prisma.setlistCue.findMany({
      where: { setlistId },
      include: cueInclude,
      orderBy: [{ setlistItemId: 'asc' }, { phase: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  listByItem(setlistItemId: string) {
    return this.prisma.setlistCue.findMany({
      where: { setlistItemId },
      include: cueInclude,
      orderBy: [{ phase: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  findById(setlistId: string, cueId: string) {
    return this.prisma.setlistCue.findFirst({ where: { id: cueId, setlistId }, include: cueInclude });
  }

  /** Valida que un `responsibleAssignmentId` pertenezca al mismo setlist (via su item), sin importar a que item apunte. */
  findAssignmentInSetlist(setlistId: string, assignmentId: string) {
    return this.prisma.setlistAssignment.findFirst({ where: { id: assignmentId, setlistItem: { setlistId } } });
  }

  listByScope(setlistId: string, setlistItemId: string | null, phase: SetlistCuePhase) {
    return this.prisma.setlistCue.findMany({ where: { setlistId, setlistItemId, phase }, include: cueInclude, orderBy: { sortOrder: 'asc' } });
  }

  countByScope(setlistId: string, setlistItemId: string | null, phase: SetlistCuePhase) {
    return this.prisma.setlistCue.count({ where: { setlistId, setlistItemId, phase } });
  }

  create(data: Prisma.SetlistCueUncheckedCreateInput) {
    return this.prisma.setlistCue.create({ data, include: cueInclude });
  }

  update(id: string, data: Prisma.SetlistCueUncheckedUpdateInput) {
    return this.prisma.setlistCue.update({ where: { id }, data, include: cueInclude });
  }

  updateStatus(id: string, status: SetlistCueStatus, userId: string) {
    const data: Prisma.SetlistCueUncheckedUpdateInput =
      status === 'COMPLETED' ? { status, completedAt: new Date(), completedById: userId } : { status, completedAt: null, completedById: null };
    return this.prisma.setlistCue.update({ where: { id }, data, include: cueInclude });
  }

  delete(id: string) {
    return this.prisma.setlistCue.delete({ where: { id } });
  }

  private async applyOrder(tx: Prisma.TransactionClient, orderedIds: string[]) {
    const tempOffset = orderedIds.length + 1000;
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.setlistCue.update({ where: { id: orderedIds[i] }, data: { sortOrder: tempOffset + i } });
    }
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.setlistCue.update({ where: { id: orderedIds[i] }, data: { sortOrder: i } });
    }
  }

  reorder(cueIds: string[]) {
    return this.prisma.$transaction((tx) => this.applyOrder(tx, cueIds));
  }

  duplicate(setlistId: string, cueId: string) {
    return this.prisma.$transaction(async (tx) => {
      const source = await tx.setlistCue.findFirst({ where: { id: cueId, setlistId } });
      if (!source) throw new NotFoundException('Cue no encontrado');

      const { id, createdAt, updatedAt, sortOrder, completedAt, completedById, status, metadata, ...rest } = source;
      const tempOrder = await tx.setlistCue.count({ where: { setlistId, setlistItemId: source.setlistItemId, phase: source.phase } });
      const created = await tx.setlistCue.create({
        data: { ...rest, status: 'PENDING', sortOrder: tempOrder, metadata: toNullableJsonInput(metadata) },
        include: cueInclude,
      });

      const scopeCues = await tx.setlistCue.findMany({
        where: { setlistId, setlistItemId: source.setlistItemId, phase: source.phase },
        orderBy: { sortOrder: 'asc' },
        select: { id: true },
      });
      const withoutNew = scopeCues.filter((cue) => cue.id !== created.id);
      const insertIndex = withoutNew.findIndex((cue) => cue.id === cueId) + 1;
      withoutNew.splice(insertIndex, 0, { id: created.id });
      await this.applyOrder(tx, withoutNew.map((cue) => cue.id));

      return created;
    });
  }

  async copy(
    setlistId: string,
    sourceItemId: string,
    targetItemId: string,
    options: { phases?: SetlistCuePhase[]; categories?: CueCategory[]; replaceExisting?: boolean; includeResponsibles?: boolean },
  ) {
    return this.prisma.$transaction(async (tx) => {
      if (options.replaceExisting) await tx.setlistCue.deleteMany({ where: { setlistItemId: targetItemId } });

      const sourceCues = await tx.setlistCue.findMany({
        where: { setlistItemId: sourceItemId, ...(options.phases?.length ? { phase: { in: options.phases } } : {}) },
        orderBy: [{ phase: 'asc' }, { sortOrder: 'asc' }],
      });
      const filtered = options.categories?.length
        ? sourceCues.filter((cue) => options.categories!.includes(getCueCategory(cue.type)))
        : sourceCues;

      const nextOrderByPhase = new Map<SetlistCuePhase, number>();

      for (const cue of filtered) {
        let nextOrder = nextOrderByPhase.get(cue.phase);
        if (nextOrder === undefined) {
          nextOrder = await tx.setlistCue.count({ where: { setlistItemId: targetItemId, phase: cue.phase } });
        }

        let responsibleParticipantId: string | null = null;
        let responsibleAssignmentId: string | null = null;
        if (options.includeResponsibles) {
          responsibleParticipantId = cue.responsibleParticipantId;
          if (cue.responsibleAssignmentId) {
            const sourceAssignment = await tx.setlistAssignment.findUnique({ where: { id: cue.responsibleAssignmentId } });
            if (sourceAssignment) {
              const equivalent = await tx.setlistAssignment.findFirst({
                where: { setlistItemId: targetItemId, participantId: sourceAssignment.participantId, role: sourceAssignment.role },
              });
              responsibleAssignmentId = equivalent?.id ?? null;
            }
          }
        }

        await tx.setlistCue.create({
          data: {
            setlistId,
            setlistItemId: targetItemId,
            type: cue.type,
            phase: cue.phase,
            status: 'PENDING',
            priority: cue.priority,
            title: cue.title,
            description: cue.description,
            offsetSec: cue.offsetSec,
            durationSec: cue.durationSec,
            sortOrder: nextOrder,
            metadata: toNullableJsonInput(cue.metadata),
            isOptional: cue.isOptional,
            isHidden: cue.isHidden,
            responsibleParticipantId,
            responsibleAssignmentId,
            createdById: cue.createdById,
          },
        });
        nextOrderByPhase.set(cue.phase, nextOrder + 1);
      }

      return tx.setlistCue.findMany({ where: { setlistItemId: targetItemId }, include: cueInclude, orderBy: [{ phase: 'asc' }, { sortOrder: 'asc' }] });
    });
  }
}
