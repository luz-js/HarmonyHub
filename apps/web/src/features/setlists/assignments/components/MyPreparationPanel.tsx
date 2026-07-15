import { useMutation } from '@tanstack/react-query';
import { queryClient } from '../../../../shared/api/query-client';
import type { AssignmentPreparationStatus, SetlistAssignment, SetlistItem } from '../../../../shared/types';
import { updateSetlistAssignmentPreparation } from '../api/setlist-assignments.client';
import { getRoleLabel } from '../utils/assignmentLabels';
import { PreparationStatusSelect } from './PreparationStatusSelect';

export function MyPreparationPanel({
  organizationId,
  setlistId,
  items,
  assignments,
  currentUserId,
}: {
  organizationId: string;
  setlistId: string;
  items: SetlistItem[];
  assignments: SetlistAssignment[];
  currentUserId?: string;
}) {
  const itemTitleById = new Map(items.map((item) => [item.id, item.title]));
  const myAssignments = assignments.filter((assignment) => assignment.participant.membership.user.id === currentUserId);

  const preparationMutation = useMutation({
    mutationFn: ({ assignment, preparationStatus }: { assignment: SetlistAssignment; preparationStatus: AssignmentPreparationStatus }) =>
      updateSetlistAssignmentPreparation(setlistId, assignment.setlistItemId, assignment.id, { preparationStatus }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['setlistTeam', organizationId, setlistId] }),
  });

  if (myAssignments.length === 0) {
    return <p className="text-xs text-muted">No tienes asignaciones en este setlist.</p>;
  }

  return (
    <div className="space-y-2">
      {myAssignments.map((assignment) => (
        <div key={assignment.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#1b2c40] px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{itemTitleById.get(assignment.setlistItemId) || 'Item'}</p>
            <p className="text-xs text-muted">{getRoleLabel(assignment.role)}</p>
          </div>
          <div className="w-40 shrink-0">
            <PreparationStatusSelect
              value={assignment.preparationStatus}
              onChange={(preparationStatus) => preparationMutation.mutate({ assignment, preparationStatus })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
