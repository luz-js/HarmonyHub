import type { AttendanceStatus, EventStatus } from '../../../shared/types';
import { getAttendanceStatusLabel, getEventStatusLabel } from '../utils';

const EVENT_STATUS_BADGE_CLASS: Record<EventStatus, string> = {
  DRAFT: 'badge badge-dot badge-draft',
  PENDING: 'badge badge-dot badge-blue',
  CONFIRMED: 'badge badge-dot badge-success',
  CANCELLED: 'badge badge-dot badge-danger',
  FINISHED: 'badge badge-neutral',
};

const ATTENDANCE_BADGE_CLASS: Record<AttendanceStatus, string> = {
  PENDING: 'badge badge-blue',
  CONFIRMED: 'badge badge-success',
  DECLINED: 'badge badge-danger',
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return <span className={EVENT_STATUS_BADGE_CLASS[status]}>{getEventStatusLabel(status)}</span>;
}

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  return <span className={ATTENDANCE_BADGE_CLASS[status]}>{getAttendanceStatusLabel(status)}</span>;
}
