import { Inject, Injectable } from '@nestjs/common';
import type { StatsQueryData } from '@harmonyhub/contracts';
import type { OrgMember } from '../permissions/current-membership.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { computeMemberLoad, computeRepertoireStats, PLAYED_EVENT_STATUSES } from './stats.utils';

/**
 * Estadisticas de la organizacion activa. La base filtra (organizacion, estados que cuentan, fechas) y trae solo
 * columnas chicas; los conteos se arman aca con las funciones de stats.utils (probadas aparte). Al navegador
 * llegan solo los resultados.
 */
@Injectable()
export class StatsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async repertoire(member: OrgMember, query: StatsQueryData, now = new Date()) {
    const { organizationId } = member;
    const [songs, events] = await Promise.all([
      this.prisma.song.findMany({ where: { organizationId }, select: { id: true, title: true, artist: true, currentKey: true, status: true } }),
      this.prisma.event.findMany({
        where: { organizationId, status: { in: [...PLAYED_EVENT_STATUSES] }, startsAt: { lt: now }, setlist: { isTemplate: false } },
        select: {
          id: true,
          startsAt: true,
          status: true,
          setlist: {
            select: {
              isTemplate: true,
              items: {
                where: { type: 'SONG', isHidden: false, songId: { not: null } },
                select: { songId: true, type: true, isHidden: true, keyOverride: true, songVersion: { select: { key: true } } },
              },
            },
          },
        },
      }),
    ]);
    return computeRepertoireStats({ songs, events, now, months: query.months });
  }

  async members(member: OrgMember, query: StatsQueryData, now = new Date()) {
    const { organizationId } = member;
    const memberships = await this.prisma.membership.findMany({
      where: { organizationId, status: 'ACTIVE' },
      select: { id: true, role: true, user: { select: { id: true, name: true, avatarUrl: true } } },
    });
    const [assignments, unavailability] = await Promise.all([
      this.prisma.eventMusician.findMany({
        where: { event: { organizationId, status: { not: 'CANCELLED' } }, membershipId: { in: memberships.map((row) => row.id) } },
        select: { membershipId: true, status: true, event: { select: { startsAt: true, status: true } } },
      }),
      // Solo las fechas (nunca la nota) y solo lo que toca los proximos 30 dias.
      this.prisma.unavailability.findMany({
        where: { userId: { in: memberships.map((row) => row.user.id) }, endsOn: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
        select: { userId: true, startsOn: true, endsOn: true },
      }),
    ]);
    return computeMemberLoad({
      members: memberships.map((row) => ({ membershipId: row.id, userId: row.user.id, name: row.user.name, avatarUrl: row.user.avatarUrl, role: row.role })),
      assignments: assignments.map((row) => ({ membershipId: row.membershipId, attendance: row.status, startsAt: row.event.startsAt, eventStatus: row.event.status })),
      unavailability,
      now,
      months: query.months,
    });
  }
}
