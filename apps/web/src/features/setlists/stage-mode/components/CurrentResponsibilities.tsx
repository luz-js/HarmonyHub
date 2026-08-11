import type { SetlistAssignment } from '../../../../shared/types';
import { getRoleLabel } from '../../assignments/utils/assignmentLabels';

export function CurrentResponsibilities({ assignments, currentUserId }: { assignments: SetlistAssignment[]; currentUserId?: string }) {
  if (assignments.length === 0) {
    return <p className="text-center text-sm text-muted">Sin responsables asignados a este item.</p>;
  }

  return (
    <div className="mx-auto grid max-w-md grid-cols-2 gap-x-6 gap-y-2">
      {assignments.map((assignment) => {
        const isMine = assignment.participant.membership.user.id === currentUserId;
        return (
          <div key={assignment.id} className={isMine ? 'col-span-2 rounded-lg border border-[var(--primary)] bg-white/5 p-2' : 'col-span-2'}>
            {isMine && <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--primary)]">Tu responsabilidad</p>}
            <p className="text-xs text-muted">{getRoleLabel(assignment.role)}</p>
            <p className="text-sm font-semibold text-white">{assignment.participant.membership.user.name}</p>
          </div>
        );
      })}
    </div>
  );
}
