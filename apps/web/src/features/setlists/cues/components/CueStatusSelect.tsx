import type { SetlistCueStatus } from '../../../../shared/types';
import { STATUS_LABELS } from '../utils/cueLabels';

const STATUS_OPTIONS: SetlistCueStatus[] = ['PENDING', 'READY', 'NEEDS_REVIEW', 'BLOCKED', 'COMPLETED', 'SKIPPED'];

export function CueStatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: SetlistCueStatus;
  onChange: (status: SetlistCueStatus) => void;
  disabled?: boolean;
}) {
  return (
    <select className="select" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as SetlistCueStatus)}>
      {STATUS_OPTIONS.map((status) => (
        <option key={status} value={status}>
          {STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  );
}
