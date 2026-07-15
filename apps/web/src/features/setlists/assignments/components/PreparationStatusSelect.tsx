import type { AssignmentPreparationStatus } from '../../../../shared/types';
import { ASSIGNMENT_PREPARATION_STATUS_KEYS, PREPARATION_STATUS_LABELS } from '../utils/assignmentLabels';

export function PreparationStatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: AssignmentPreparationStatus;
  onChange: (status: AssignmentPreparationStatus) => void;
  disabled?: boolean;
}) {
  return (
    <select
      className="select"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as AssignmentPreparationStatus)}
    >
      {ASSIGNMENT_PREPARATION_STATUS_KEYS.map((status) => (
        <option key={status} value={status}>
          {PREPARATION_STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  );
}
