import { Inject, Injectable } from '@nestjs/common';
import { AttendanceStatus, EventStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const eventInclude = {
  setlist: { select: { id: true, name: true, status: true, estimatedSec: true, itemCount: true } },
  musicians: {
    orderBy: { createdAt: 'asc' },
    include: {
      membership: {
        select: {
          id: true,
          role: true,
          instrument: true,
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      },
    },
  },
} satisfies Prisma.EventInclude;

export type EventListFilters = {
  from?: Date;
  to?: Date;
  status?: EventStatus;
  search?: string;
  includeCancelled?: boolean;
  order: 'asc' | 'desc';
  skip: number;
  take: number;
};

@Injectable()
export class EventsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(organizationId: string, filters: EventListFilters) {
    const where: Prisma.EventWhereInput = {
      organizationId,
      ...(filters.from || filters.to ? { startsAt: { gte: filters.from, lte: filters.to } } : {}),
      status: filters.status || (filters.includeCancelled ? undefined : { not: 'CANCELLED' }),
      ...(filters.search ? { name: { contains: filters.search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        orderBy: { startsAt: filters.order },
        skip: filters.skip,
        take: filters.take,
        include: eventInclude,
      }),
      this.prisma.event.count({ where }),
    ]);

    return { items, total };
  }

  findDetail(id: string, organizationId: string) {
    return this.prisma.event.findFirst({ where: { id, organizationId }, include: eventInclude });
  }

  create(data: Prisma.EventUncheckedCreateInput) {
    return this.prisma.event.create({ data, include: eventInclude });
  }

  update(id: string, data: Prisma.EventUncheckedUpdateInput) {
    return this.prisma.event.update({ where: { id }, data, include: eventInclude });
  }

  delete(id: string) {
    return this.prisma.event.delete({ where: { id } });
  }

  findSetlistInOrganization(setlistId: string, organizationId: string) {
    return this.prisma.setlist.findFirst({ where: { id: setlistId, organizationId }, select: { id: true, isTemplate: true, status: true } });
  }

  findActiveMembership(membershipId: string, organizationId: string) {
    return this.prisma.membership.findFirst({ where: { id: membershipId, organizationId, status: 'ACTIVE' } });
  }

  findMusician(eventId: string, musicianId: string) {
    return this.prisma.eventMusician.findFirst({ where: { id: musicianId, eventId }, include: { membership: { select: { userId: true } } } });
  }

  findMusicianByMembership(eventId: string, membershipId: string) {
    return this.prisma.eventMusician.findUnique({ where: { eventId_membershipId: { eventId, membershipId } } });
  }

  addMusician(data: { eventId: string; membershipId: string; instrument?: string | null; note?: string | null }) {
    return this.prisma.eventMusician.create({ data });
  }

  updateMusician(id: string, data: { status?: AttendanceStatus; instrument?: string | null; note?: string | null }) {
    return this.prisma.eventMusician.update({ where: { id }, data });
  }

  removeMusician(id: string) {
    return this.prisma.eventMusician.delete({ where: { id } });
  }
}
