import { AlertTriangle, Users } from 'lucide-react';
import type { TeamSummary } from '../utils/teamSummary';

export function TeamSummaryRow({ summary }: { summary: TeamSummary | null }) {
  if (!summary || summary.totalCount === 0) return null;

  return (
    <div className="mt-1 flex min-w-0 items-center gap-2 text-[11px] text-muted">
      <Users className="h-3 w-3 shrink-0" />
      <span className="truncate">
        {summary.primaries.slice(0, 2).map((primary) => primary.name).join(', ')}
        {summary.extraCount > 0 && ` +${summary.extraCount}`}
      </span>
      <span className="shrink-0">
        {summary.readyCount}/{summary.totalCount} listos
      </span>
      {summary.missingRolesCount > 0 && (
        <span className="badge badge-warning shrink-0" title="Roles sin cubrir">
          <AlertTriangle className="h-3 w-3" /> {summary.missingRolesCount}
        </span>
      )}
    </div>
  );
}
