import { Inject, Injectable } from '@nestjs/common';
import { Prisma, SetlistStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { calculateSetlistEstimatedSec } from './setlist.utils';

const summaryInclude = {
  createdBy: { select: { id: true, name: true } },
  items: { select: { type: true } },
} satisfies Prisma.SetlistInclude;

const itemDetailInclude = {
  song: { select: { id: true, title: true, artist: true, coverUrl: true } },
  songVersion: { select: { id: true, name: true, key: true, bpm: true, durationSec: true, isDefault: true } },
} satisfies Prisma.SetlistItemInclude;

const roleRequirementInclude = {
  roleRequirements: true,
} satisfies Prisma.SetlistItemInclude;

type CloneSetlistInput = {
  sourceSetlistId: string;
  organizationId: string;
  name: string;
  description: string | null;
  isTemplate: boolean;
  createdById: string;
  updatedById: string;
};

@Injectable()
export class SetlistsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(organizationId: string, filters: { status?: SetlistStatus; search?: string; includeArchived?: boolean; isTemplate?: boolean; skip: number; take: number }) {
    const where: Prisma.SetlistWhereInput = {
      organizationId,
      isTemplate: filters.isTemplate ?? false,
      status: filters.status || (filters.includeArchived ? undefined : { not: 'ARCHIVED' }),
      ...(filters.search ? { name: { contains: filters.search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.setlist.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: filters.skip,
        take: filters.take,
        include: summaryInclude,
      }),
      this.prisma.setlist.count({ where }),
    ]);

    return { items, total };
  }

  findById(id: string, organizationId: string) {
    return this.prisma.setlist.findFirst({ where: { id, organizationId } });
  }

  findDetail(id: string, organizationId: string) {
    return this.prisma.setlist.findFirst({
      where: { id, organizationId },
      include: {
        items: { orderBy: { order: 'asc' }, include: itemDetailInclude },
      },
    });
  }

  create(data: Prisma.SetlistUncheckedCreateInput) {
    return this.prisma.setlist.create({ data });
  }

  update(id: string, data: Prisma.SetlistUncheckedUpdateInput) {
    return this.prisma.setlist.update({ where: { id }, data });
  }

  countEvents(setlistId: string) {
    return this.prisma.event.count({ where: { setlistId } });
  }

  delete(id: string) {
    return this.prisma.setlist.delete({ where: { id } });
  }

  async cloneSetlist(input: CloneSetlistInput) {
    return this.prisma.$transaction(async (tx) => {
      const source = await tx.setlist.findUnique({
        where: { id: input.sourceSetlistId },
        include: {
          items: {
            orderBy: { order: 'asc' },
            include: roleRequirementInclude,
          },
          cues: {
            orderBy: [{ setlistItemId: 'asc' }, { sortOrder: 'asc' }],
          },
        },
      });

      if (!source) throw new Error('Source setlist not found');

      const created = await tx.setlist.create({
        data: {
          organizationId: input.organizationId,
          name: input.name,
          description: input.description,
          status: 'DRAFT',
          isTemplate: input.isTemplate,
          estimatedSec: 0,
          itemCount: 0,
          createdById: input.createdById,
          updatedById: input.updatedById,
        },
      });

      const itemIdMap = new Map<string, string>();

      for (const item of source.items) {
        const createdItem = await tx.setlistItem.create({
          data: {
            setlistId: created.id,
            type: item.type,
            songId: item.songId,
            songVersionId: item.songVersionId,
            title: item.title,
            description: item.description,
            order: item.order,
            estimatedSec: item.estimatedSec,
            keyOverride: item.keyOverride,
            bpmOverride: item.bpmOverride,
            durationOverrideSec: item.durationOverrideSec,
            capo: item.capo,
            transitionNote: item.transitionNote,
            internalNote: item.internalNote,
            includeClick: item.includeClick,
            includePad: item.includePad,
            isOptional: item.isOptional,
            isHidden: item.isHidden,
          },
        });
        itemIdMap.set(item.id, createdItem.id);

        for (const requirement of item.roleRequirements) {
          await tx.setlistRoleRequirement.create({
            data: {
              setlistItemId: createdItem.id,
              role: requirement.role,
              label: requirement.label,
              minimumCount: requirement.minimumCount,
              isRequired: requirement.isRequired,
            },
          });
        }
      }

      for (const cue of source.cues) {
        await tx.setlistCue.create({
          data: {
            setlistId: created.id,
            setlistItemId: cue.setlistItemId ? (itemIdMap.get(cue.setlistItemId) ?? null) : null,
            type: cue.type,
            phase: cue.phase,
            status: 'PENDING',
            priority: cue.priority,
            title: cue.title,
            description: cue.description,
            offsetSec: cue.offsetSec,
            durationSec: cue.durationSec,
            sortOrder: cue.sortOrder,
            metadata: cue.metadata as Prisma.InputJsonValue | undefined,
            isOptional: cue.isOptional,
            isHidden: cue.isHidden,
            responsibleParticipantId: null,
            responsibleAssignmentId: null,
            createdById: input.createdById,
            completedById: null,
            completedAt: null,
          },
        });
      }

      await this.recalculateStats(created.id, tx);

      return await tx.setlist.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          items: { orderBy: { order: 'asc' }, include: itemDetailInclude },
        },
      });
    });
  }

  async recalculateStats(setlistId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const items = await client.setlistItem.findMany({
      where: { setlistId },
      select: { isHidden: true, durationOverrideSec: true, estimatedSec: true, songVersion: { select: { durationSec: true } } },
    });
    return client.setlist.update({
      where: { id: setlistId },
      data: { itemCount: items.length, estimatedSec: calculateSetlistEstimatedSec(items) },
    });
  }
}
