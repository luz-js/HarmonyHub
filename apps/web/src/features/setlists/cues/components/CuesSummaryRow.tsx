import { AlertTriangle, ListOrdered } from 'lucide-react';
import type { CuesSummary } from '../utils/cuesSummary';

export function CuesSummaryRow({ summary }: { summary: CuesSummary | null }) {
  if (!summary || summary.total === 0) return null;

  return (
    <div className="mt-1 flex min-w-0 items-center gap-2 text-[11px] text-muted">
      <ListOrdered className="h-3 w-3 shrink-0" />
      <span className="shrink-0">
        {summary.ready}/{summary.total} cues listos
      </span>
      {summary.criticalWithoutResponsible > 0 && (
        <span className="badge badge-warning shrink-0" title="Cues criticos sin responsable">
          <AlertTriangle className="h-3 w-3" /> {summary.criticalWithoutResponsible}
        </span>
      )}
    </div>
  );
}
