import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { SetlistItemType, SetlistMusicalRole } from '../../../../shared/types';
import { useCreateSetlistRoleRequirement, useDeleteSetlistRoleRequirement, useSetlistRoleRequirements } from '../hooks/useSetlistRoleRequirements';
import { getRoleLabel } from '../utils/assignmentLabels';
import { MusicalRolePicker } from './MusicalRolePicker';

export function RoleRequirementsList({
  organizationId,
  setlistId,
  itemId,
  itemType,
  canManage,
}: {
  organizationId: string;
  setlistId: string;
  itemId: string;
  itemType: SetlistItemType;
  canManage: boolean;
}) {
  const requirementsQuery = useSetlistRoleRequirements(organizationId, setlistId, itemId);
  const createMutation = useCreateSetlistRoleRequirement(organizationId, setlistId, itemId);
  const deleteMutation = useDeleteSetlistRoleRequirement(organizationId, setlistId, itemId);

  const [adding, setAdding] = useState(false);
  const [role, setRole] = useState<SetlistMusicalRole | ''>('');
  const [minimumCount, setMinimumCount] = useState('1');

  const requirements = requirementsQuery.data || [];
  const existingRoles = new Set(requirements.map((requirement) => requirement.role));

  function handleAdd() {
    if (!role) return;
    createMutation.mutate(
      { role, minimumCount: Number(minimumCount) || 1 },
      {
        onSuccess: () => {
          setAdding(false);
          setRole('');
          setMinimumCount('1');
        },
      },
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="label">Requisitos de roles</span>
        {canManage && !adding && (
          <button type="button" className="btn-ghost h-6 px-2 text-xs" onClick={() => setAdding(true)}>
            <Plus className="h-3 w-3" /> Agregar
          </button>
        )}
      </div>

      {requirements.length === 0 && !adding && <p className="mt-1 text-xs text-muted">Sin requisitos definidos para este item.</p>}

      <ul className="mt-1 space-y-1">
        {requirements.map((requirement) => (
          <li key={requirement.id} className="flex items-center justify-between gap-2 rounded-md border border-[#30333A] px-2 py-1 text-xs text-white">
            <span>
              {requirement.label || getRoleLabel(requirement.role)} · minimo {requirement.minimumCount}
            </span>
            {canManage && (
              <button type="button" className="btn-ghost h-6 w-6 p-0" aria-label="Eliminar requisito" onClick={() => deleteMutation.mutate(requirement.id)}>
                <X className="h-3 w-3" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {adding && (
        <div className="mt-2 space-y-2 rounded-md border border-[#30333A] p-2">
          <MusicalRolePicker itemType={itemType} value={role} onChange={setRole} />
          <div className="flex items-center gap-2">
            <label className="flex-1">
              <span className="label">Cantidad minima</span>
              <input className="input" type="number" min={1} max={20} value={minimumCount} onChange={(event) => setMinimumCount(event.target.value)} />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost h-8 px-3 text-xs" onClick={() => setAdding(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary h-8 px-3 text-xs"
              disabled={!role || (role ? existingRoles.has(role) : false) || createMutation.isPending}
              onClick={handleAdd}
            >
              Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
