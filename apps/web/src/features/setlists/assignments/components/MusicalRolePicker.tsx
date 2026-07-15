import type { SetlistItemType, SetlistMusicalRole } from '../../../../shared/types';
import { getRoleLabel, ROLES_BY_ITEM_TYPE } from '../utils/assignmentLabels';

export function MusicalRolePicker({
  itemType,
  value,
  onChange,
}: {
  itemType: SetlistItemType;
  value: SetlistMusicalRole | '';
  onChange: (role: SetlistMusicalRole) => void;
}) {
  const roles = ROLES_BY_ITEM_TYPE[itemType];
  return (
    <select className="select" value={value} onChange={(event) => onChange(event.target.value as SetlistMusicalRole)}>
      <option value="" disabled>
        Selecciona un rol
      </option>
      {roles.map((role) => (
        <option key={role} value={role}>
          {getRoleLabel(role)}
        </option>
      ))}
    </select>
  );
}
