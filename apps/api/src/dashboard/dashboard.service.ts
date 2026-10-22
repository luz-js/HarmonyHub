import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { mapEventSummary } from '../events/event.mapper';
import type { OrgMember } from '../permissions/current-membership.decorator';
import { DashboardRepository } from './dashboard.repository';

const activityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
});

@Injectable()
export class DashboardService {
  constructor(@Inject(DashboardRepository) private readonly dashboardRepository: DashboardRepository) {}

  /** Resumen de la organizacion activa: contadores, proximos eventos, asistencia pendiente propia y actividad reciente. */
  async summary({ userId, organizationId }: OrgMember) {
    const now = new Date();

    const [counts, upcoming, pending, activity] = await Promise.all([
      this.dashboardRepository.counts(organizationId, now),
      this.dashboardRepository.upcomingEvents(organizationId, now, 5),
      this.dashboardRepository.pendingAttendance(organizationId, userId, now),
      this.dashboardRepository.recentActivity(organizationId, 8),
    ]);

    const upcomingEvents = upcoming.map((event) => mapEventSummary(event, userId));
    return {
      counts,
      nextEvent: upcomingEvents[0] ?? null,
      upcomingEvents,
      pendingAttendance: pending.map((item) => ({
        musicianId: item.id,
        event: { ...item.event, startsAt: item.event.startsAt.toISOString() },
      })),
      recentActivity: activity.map(mapActivity),
    };
  }

  async activity({ organizationId }: OrgMember, query: Record<string, unknown>) {
    const parsed = activityQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Filtros invalidos');
    const items = await this.dashboardRepository.recentActivity(organizationId, parsed.data.limit);
    return { items: items.map(mapActivity) };
  }
}

type ActivityRow = {
  id: string;
  action: string;
  entityType: string;
  summary: string;
  createdAt: Date;
  actor: { id: string; name: string; avatarUrl: string | null } | null;
  song: { id: string; title: string; artist: string };
};

function mapActivity(item: ActivityRow) {
  return {
    id: item.id,
    action: item.action,
    entityType: item.entityType,
    summary: item.summary,
    createdAt: item.createdAt.toISOString(),
    actor: item.actor,
    song: item.song,
  };
}
