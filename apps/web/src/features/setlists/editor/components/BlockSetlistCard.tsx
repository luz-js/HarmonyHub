import type { SetlistItem } from '../../../../shared/types';
import { formatDuration } from '../../../../shared/utils/format';
import { CuesSummaryRow } from '../../cues/components/CuesSummaryRow';
import type { CuesSummary } from '../../cues/utils/cuesSummary';
import { TYPE_BADGE_CLASS, TYPE_ICONS } from '../utils/setlistItemTheme';

export function BlockSetlistCard({ item, cuesSummary }: { item: SetlistItem; cuesSummary?: CuesSummary | null }) {
  const Icon = TYPE_ICONS[item.type];

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span className={`icon-tile h-10 w-10 shrink-0 ${TYPE_BADGE_CLASS[item.type]}`}>
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">{item.title}</p>
        {item.description && <p className="truncate text-xs text-muted">{item.description}</p>}
        {item.transitionNote && <p className="mt-0.5 truncate text-[11px] text-faint">Transicion: {item.transitionNote}</p>}
        <CuesSummaryRow summary={cuesSummary ?? null} />
      </div>

      {item.effective.durationSec != null && (
        <span className={`badge shrink-0 ${TYPE_BADGE_CLASS[item.type]}`}>{formatDuration(item.effective.durationSec)}</span>
      )}
    </div>
  );
}
