import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { userInstrumentsSelect } from '../../shared/user-instruments';

const participantInclude = {
  membership: {
    select: {
      id: true,
      role: true,
      status: true,
      user: { select: { id: true, name: true, email: true, avatarUrl: true, instruments: userInstrumentsSelect } },
    },
  },
} satisfies Prisma.SetlistParticipantInclude;

@Injectable()
export class SetlistParticipantsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  list(setlistId: string) {
    return this.prisma.setlistParticipant.findMany({ where: { setlistId }, include: participantInclude, orderBy: { createdAt: 'asc' } });
  }

  findById(setlistId: string, participantId: string) {
    return this.prisma.setlistParticipant.findFirst({ where: { id: participantId, setlistId }, include: participantInclude });
  }

  findByMembership(setlistId: string, membershipId: string) {
    return this.prisma.setlistParticipant.findFirst({ where: { setlistId, membershipId } });
  }

  findMembershipForValidation(membershipId: string, organizationId: string) {
    return this.prisma.membership.findFirst({ where: { id: membershipId, organizationId } });
  }

  create(data: Prisma.SetlistParticipantUncheckedCreateInput) {
    return this.prisma.setlistParticipant.create({ data, include: participantInclude });
  }

  update(id: string, data: Prisma.SetlistParticipantUncheckedUpdateInput) {
    return this.prisma.setlistParticipant.update({ where: { id }, data, include: participantInclude });
  }

  countAssignments(participantId: string) {
    return this.prisma.setlistAssignment.count({ where: { participantId } });
  }

  delete(id: string) {
    return this.prisma.setlistParticipant.delete({ where: { id } });
  }

  deleteWithAssignments(id: string) {
    return this.prisma.$transaction([
      this.prisma.setlistAssignment.deleteMany({ where: { participantId: id } }),
      this.prisma.setlistParticipant.delete({ where: { id } }),
    ]);
  }

  async assignmentCounts(participantIds: string[]) {
    if (participantIds.length === 0) return [];
    const rows = await this.prisma.setlistAssignment.groupBy({
      by: ['participantId', 'preparationStatus'],
      where: { participantId: { in: participantIds } },
      _count: { _all: true },
    });
    return rows.map((row) => ({ participantId: row.participantId, preparationStatus: row.preparationStatus, _count: row._count._all }));
  }
}
