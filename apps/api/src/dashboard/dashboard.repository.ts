import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { userInstrumentsSelect } from '../shared/user-instruments';

const upcomingEventInclude = {
  setlist: { select: { id: true, name: true, status: true, estimatedSec: true, itemCount: true } },
  musicians: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      membership: {
        select: {
          id: true,
          role: true,
          user: { select: { id: true, name: true, email: true, avatarUrl: true, instruments: userInstrumentsSelect } },
        },
      },
    },
  },
};

@Injectable()
export class DashboardRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async counts(organizationId: string, now: Date) {
    const [songs, setlists, members, upcomingEvents] = await this.prisma.$transaction([
      this.prisma.song.count({ where: { organizationId, status: { not: 'ARCHIVED' } } }),
      this.prisma.setlist.count({ where: { organizationId, isTemplate: false, status: { not: 'ARCHIVED' } } }),
      this.prisma.membership.count({ where: { organizationId, status: 'ACTIVE' } }),
      this.prisma.event.count({ where: { organizationId, startsAt: { gte: now }, status: { notIn: ['CANCELLED', 'FINISHED'] } } }),
    ]);
    return { songs, setlists, members, upcomingEvents };
  }

  upcomingEvents(organizationId: string, now: Date, take: number) {
    return this.prisma.event.findMany({
      where: { organizationId, startsAt: { gte: now }, status: { notIn: ['CANCELLED', 'FINISHED'] } },
      orderBy: { startsAt: 'asc' },
      take,
      include: upcomingEventInclude,
    });
  }

  pendingAttendance(organizationId: string, userId: string, now: Date) {
    return this.prisma.eventMusician.findMany({
      where: {
        status: 'PENDING',
        membership: { userId, organizationId },
        event: { organizationId, startsAt: { gte: now }, status: { notIn: ['CANCELLED', 'FINISHED'] } },
      },
      orderBy: { event: { startsAt: 'asc' } },
      take: 10,
      include: { event: { select: { id: true, name: true, startsAt: true, location: true } } },
    });
  }

  recentActivity(organizationId: string, take: number) {
    return this.prisma.songActivity.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        actor: { select: { id: true, name: true, avatarUrl: true } },
        song: { select: { id: true, title: true, artist: true } },
      },
    });
  }
}
