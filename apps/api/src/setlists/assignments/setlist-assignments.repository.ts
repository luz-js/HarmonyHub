import { Inject, Injectable } from '@nestjs/common';
import { Prisma, SetlistMusicalRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { matchesCopyMode, type CopyAssignmentsMode } from './setlist-assignment.utils';

const assignmentInclude = {
  participant: {
    select: {
      id: true,
      status: true,
      membership: {
        select: { id: true, instrument: true, user: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
  },
} satisfies Prisma.SetlistAssignmentInclude;

@Injectable()
export class SetlistAssignmentsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listByItem(setlistItemId: string) {
    return this.prisma.setlistAssignment.findMany({ where: { setlistItemId }, include: assignmentInclude, orderBy: { sortOrder: 'asc' } });
  }

  listBySetlist(setlistId: string) {
    return this.prisma.setlistAssignment.findMany({ where: { setlistItem: { setlistId } }, include: assignmentInclude, orderBy: { sortOrder: 'asc' } });
  }

  findById(setlistItemId: string, assignmentId: string) {
    return this.prisma.setlistAssignment.findFirst({ where: { id: assignmentId, setlistItemId }, include: assignmentInclude });
  }

  findParticipantInSetlist(setlistId: string, participantId: string) {
    return this.prisma.setlistParticipant.findFirst({ where: { id: participantId, setlistId } });
  }

  countByItem(setlistItemId: string) {
    return this.prisma.setlistAssignment.count({ where: { setlistItemId } });
  }

  create(data: Prisma.SetlistAssignmentUncheckedCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      if (data.isPrimary) {
        await tx.setlistAssignment.updateMany({
          where: { setlistItemId: data.setlistItemId, role: data.role as SetlistMusicalRole, isPrimary: true },
          data: { isPrimary: false },
        });
      }
      return tx.setlistAssignment.create({ data, include: assignmentInclude });
    });
  }

  update(id: string, setlistItemId: string, role: SetlistMusicalRole, data: Prisma.SetlistAssignmentUncheckedUpdateInput) {
    return this.prisma.$transaction(async (tx) => {
      if (data.isPrimary) {
        await tx.setlistAssignment.updateMany({
          where: { setlistItemId, role, isPrimary: true, NOT: { id } },
          data: { isPrimary: false },
        });
      }
      return tx.setlistAssignment.update({ where: { id }, data, include: assignmentInclude });
    });
  }

  updatePreparation(id: string, preparationStatus: string, preparationNote?: string | null) {
    return this.prisma.setlistAssignment.update({
      where: { id },
      data: { preparationStatus: preparationStatus as any, preparationNote },
      include: assignmentInclude,
    });
  }

  delete(id: string) {
    return this.prisma.setlistAssignment.delete({ where: { id } });
  }

  async copy(sourceItemId: string, targetItemId: string, mode: CopyAssignmentsMode, replaceExisting: boolean) {
    return this.prisma.$transaction(async (tx) => {
      if (replaceExisting) await tx.setlistAssignment.deleteMany({ where: { setlistItemId: targetItemId } });

      const allSourceAssignments = await tx.setlistAssignment.findMany({ where: { setlistItemId: sourceItemId } });
      const sourceAssignments = allSourceAssignments.filter((assignment) => matchesCopyMode(assignment.role, mode));
      const existingCount = await tx.setlistAssignment.count({ where: { setlistItemId: targetItemId } });
      let sortOrder = existingCount;

      for (const source of sourceAssignments) {
        const existing = await tx.setlistAssignment.findFirst({
          where: { setlistItemId: targetItemId, participantId: source.participantId, role: source.role },
        });
        if (existing) continue;
        await tx.setlistAssignment.create({
          data: {
            setlistItemId: targetItemId,
            participantId: source.participantId,
            role: source.role,
            instrument: source.instrument,
            label: source.label,
            isPrimary: source.isPrimary,
            isRequired: source.isRequired,
            preparationStatus: 'PENDING',
            sortOrder: sortOrder++,
            createdById: source.createdById,
          },
        });
      }

      return tx.setlistAssignment.findMany({ where: { setlistItemId: targetItemId }, include: assignmentInclude, orderBy: { sortOrder: 'asc' } });
    });
  }
}
