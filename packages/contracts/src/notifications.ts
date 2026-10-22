import { z } from 'zod';

export const NOTIFICATION_TYPES = [
  'EVENT_TEAM_ADDED',
  'EVENT_CANCELLED',
  'EVENT_RESCHEDULED',
  'EVENT_REMINDER',
  'SETLIST_PARTICIPANT_ADDED',
  'SETLIST_ASSIGNMENT_ADDED',
  'SETLIST_PUBLISHED',
  'INVITATION_RECEIVED',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// ---- Pedidos ----

/** GET /api/notifications: paginado por cursor (el id del ultimo aviso de la pagina anterior). */
export const notificationsListQuerySchema = z.object({
  limit: z.coerce.number<number | string>().int().min(1).max(50).default(20),
  cursor: z.string().trim().min(1).optional(),
});
export type NotificationsListQueryData = z.output<typeof notificationsListQuerySchema>;

// ---- Respuestas ----

/** Aviso dentro de la app (de la persona de la sesion). `link` lleva a la pantalla relacionada. */
export type AppNotification = {
  id: string;
  organizationId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsPage = { items: AppNotification[]; nextCursor: string | null; unread: number };
