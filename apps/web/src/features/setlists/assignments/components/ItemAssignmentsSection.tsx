import { useState } from 'react';
import { Copy } from 'lucide-react';
import type { SetlistItem } from '../../../../shared/types';
import { useSetlistItems } from '../../hooks';
import {
  useDeleteSetlistAssignment,
  useUpdateSetlistAssignment,
  useUpdateSetlistAssignmentPreparation,
} from '../hooks/useSetlistAssignmentMutations';
import { useSetlistItemAssignments } from '../hooks/useSetlistItemAssignments';
import { useSetlistRoleRequirements } from '../hooks/useSetlistRoleRequirements';
import { computeItemCoverage } from '../utils/coverage';
import { AssignmentRow } from './AssignmentRow';
import { CopyAssignmentsDialog } from './CopyAssignmentsDialog';
import { MissingRolesAlert } from './MissingRolesAlert';
import { QuickAssignPopover } from './QuickAssignPopover';
import { RoleRequirementsList } from './RoleRequirementsList';

export function ItemAssignmentsSection({
  organizationId,
  setlistId,
  item,
  canManage,
  currentUserId,
}: {
  organizationId: string;
  setlistId: string;
  item: SetlistItem;
  canManage: boolean;
  currentUserId?: string;
}) {
  const [copyOpen, setCopyOpen] = useState(false);
  const itemsQuery = useSetlistItems(organizationId, setlistId);
  const assignmentsQuery = useSetlistItemAssignments(organizationId, setlistId, item.id);
  const requirementsQuery = useSetlistRoleRequirements(organizationId, setlistId, item.id);
  const updateMutation = useUpdateSetlistAssignment(organizationId, setlistId, item.id);
  const deleteMutation = useDeleteSetlistAssignment(organizationId, setlistId, item.id);
  const preparationMutation = useUpdateSetlistAssignmentPreparation(organizationId, setlistId, item.id);

  const assignments = assignmentsQuery.data || [];
  const requirements = requirementsQuery.data || [];
  const coverage = computeItemCoverage(assignments, requirements);
  const otherItems = (itemsQuery.data || []).filter((candidate) => candidate.id !== item.id);

  return (
    <div className="space-y-3">
      <MissingRolesAlert coverage={coverage} />

      <div className="flex items-center justify-between">
        <span className="label">Musicos asignados</span>
        <div className="flex items-center gap-2">
          {canManage && otherItems.length > 0 && (
            <button type="button" className="btn-ghost h-8 px-3 text-xs" onClick={() => setCopyOpen(true)}>
              <Copy className="h-3.5 w-3.5" /> Copiar
            </button>
          )}
          {canManage && <QuickAssignPopover organizationId={organizationId} setlistId={setlistId} itemId={item.id} itemType={item.type} />}
        </div>
      </div>

      <div className="space-y-2">
        {assignments.map((assignment) => (
          <AssignmentRow
            key={assignment.id}
            assignment={assignment}
            itemType={item.type}
            canManage={canManage}
            canEditPreparation={canManage || assignment.participant.membership.user.id === currentUserId}
            onChangeRole={(role) => updateMutation.mutate({ assignmentId: assignment.id, input: { role } })}
            onToggleIsPrimary={(isPrimary) => updateMutation.mutate({ assignmentId: assignment.id, input: { isPrimary } })}
            onChangeInstrument={(instrument) => updateMutation.mutate({ assignmentId: assignment.id, input: { instrument: instrument || null } })}
            onChangePreparation={(preparationStatus) => preparationMutation.mutate({ assignmentId: assignment.id, input: { preparationStatus } })}
            onDelete={() => deleteMutation.mutate(assignment.id)}
          />
        ))}
        {assignments.length === 0 && <p className="text-xs text-muted">Nadie asignado a este item todavia.</p>}
      </div>

      {canManage && (
        <div className="border-t border-[#1b2c40] pt-3">
          <RoleRequirementsList organizationId={organizationId} setlistId={setlistId} itemId={item.id} itemType={item.type} canManage={canManage} />
        </div>
      )}

      {copyOpen && (
        <CopyAssignmentsDialog
          organizationId={organizationId}
          setlistId={setlistId}
          targetItem={item}
          otherItems={otherItems}
          onClose={() => setCopyOpen(false)}
        />
      )}
    </div>
  );
}
