export type NotificationType =
  | 'EVENT_TEAM_ADDED'
  | 'EVENT_CANCELLED'
  | 'EVENT_RESCHEDULED'
  | 'EVENT_REMINDER'
  | 'SETLIST_PARTICIPANT_ADDED'
  | 'SETLIST_ASSIGNMENT_ADDED'
  | 'SETLIST_PUBLISHED'
  | 'INVITATION_RECEIVED';

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
