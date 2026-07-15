import type { AssignmentPreparationStatus } from '../../../../shared/types';
import { PREPARATION_STATUS_BADGE_CLASS, PREPARATION_STATUS_LABELS } from '../utils/assignmentLabels';

export function PreparationStatusBadge({ status }: { status: AssignmentPreparationStatus }) {
  return <span className={`badge ${PREPARATION_STATUS_BADGE_CLASS[status]}`}>{PREPARATION_STATUS_LABELS[status]}</span>;
}
