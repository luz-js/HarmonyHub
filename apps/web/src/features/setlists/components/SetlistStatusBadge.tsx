import type { SetlistStatus } from '../../../shared/types';
import { getSetlistStatusLabel } from '../utils';

const STATUS_BADGE_CLASS: Record<SetlistStatus, string> = {
  DRAFT: 'badge',
  READY: 'badge badge-blue',
  PUBLISHED: 'badge badge-primary',
  ARCHIVED: 'badge',
};

export function SetlistStatusBadge({ status }: { status: SetlistStatus }) {
  return <span className={STATUS_BADGE_CLASS[status]}>{getSetlistStatusLabel(status)}</span>;
}
