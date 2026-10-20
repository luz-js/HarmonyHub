import type { EventSummary } from './event.types';

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
