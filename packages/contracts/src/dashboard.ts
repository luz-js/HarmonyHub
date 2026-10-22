import { z } from 'zod';
import type { EventSummary } from './events';

// ---- Pedidos ----

/** GET /api/dashboard/activity */
export const dashboardActivityQuerySchema = z.object({
  limit: z.coerce.number<number | string>().int().min(1).max(100).optional().default(30),
});
export type DashboardActivityQueryData = z.output<typeof dashboardActivityQuerySchema>;

// ---- Respuestas ----

export type DashboardActivityItem = {
  id: string;
  action: string;
  entityType: string;
  summary: string;
  createdAt: string;
  actor: { id: string; name: string; avatarUrl: string | null } | null;
  song: { id: string; title: string; artist: string };
};

export type DashboardPendingAttendance = {
  musicianId: string;
  event: { id: string; name: string; startsAt: string; location: string | null };
};

export type DashboardSummary = {
  counts: { songs: number; setlists: number; members: number; upcomingEvents: number };
  nextEvent: EventSummary | null;
  upcomingEvents: EventSummary[];
  pendingAttendance: DashboardPendingAttendance[];
  recentActivity: DashboardActivityItem[];
};
