import type { SetlistCuePriority } from '../../../../shared/types';
import { PRIORITY_BADGE_CLASS, PRIORITY_LABELS } from '../utils/cueLabels';

export function CuePriorityBadge({ priority }: { priority: SetlistCuePriority }) {
  return <span className={`badge ${PRIORITY_BADGE_CLASS[priority]}`}>{PRIORITY_LABELS[priority]}</span>;
}
