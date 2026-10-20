import type { SetlistStatus } from '../../../shared/types';
import { getSetlistStatusLabel } from '../utils';

const STATUS_BADGE_CLASS: Record<SetlistStatus, string> = {
  DRAFT: 'badge badge-dot badge-draft',
  READY: 'badge badge-dot badge-blue',
  PUBLISHED: 'badge badge-dot badge-success',
  ARCHIVED: 'badge badge-neutral',
};

export function SetlistStatusBadge({ status }: { status: SetlistStatus }) {
  return <span className={STATUS_BADGE_CLASS[status]}>{getSetlistStatusLabel(status)}</span>;
}
