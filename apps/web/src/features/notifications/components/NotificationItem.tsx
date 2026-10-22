import { AlarmClock, CalendarClock, CalendarX2, ListMusic, Mail, Music2, Send, Users, type LucideIcon } from 'lucide-react';
import type { AppNotification, NotificationType } from '../../../shared/types';
import { formatNotificationTime } from '../utils/notification.utils';

const ICON_BY_TYPE: Record<NotificationType, LucideIcon> = {
  EVENT_TEAM_ADDED: Users,
  EVENT_CANCELLED: CalendarX2,
  EVENT_RESCHEDULED: CalendarClock,
  EVENT_REMINDER: AlarmClock,
  SETLIST_PARTICIPANT_ADDED: ListMusic,
  SETLIST_ASSIGNMENT_ADDED: Music2,
  SETLIST_PUBLISHED: Send,
  INVITATION_RECEIVED: Mail,
};

/** Un aviso: abrirlo lo marca como leido y lleva a la pantalla relacionada. */
export function NotificationItem({ notification, onOpen }: { notification: AppNotification; onOpen: (notification: AppNotification) => void }) {
  const Icon = ICON_BY_TYPE[notification.type] ?? Mail;
  const unread = !notification.readAt;

  return (
    <button
      type="button"
      className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/[0.04] ${unread ? 'bg-[var(--primary-tint)]/40' : ''}`}
      onClick={() => onOpen(notification)}
      aria-label={`${unread ? 'Sin leer: ' : ''}${notification.title}`}
    >
      <span className="icon-tile h-9 w-9 shrink-0 rounded-lg">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm ${unread ? 'font-bold text-white' : 'font-semibold text-[#D8D5CE]'}`}>{notification.title}</span>
        {notification.body && <span className="mt-0.5 block text-[13px] text-muted">{notification.body}</span>}
        <span className="mt-1 block text-xs text-faint">{formatNotificationTime(notification.createdAt)}</span>
      </span>
      {unread && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--primary)]" aria-hidden />}
    </button>
  );
}
