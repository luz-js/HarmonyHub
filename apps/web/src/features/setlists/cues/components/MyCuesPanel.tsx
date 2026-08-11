import type { SetlistCue, SetlistItem } from '../../../../shared/types';
import { useUpdateSetlistCueStatus } from '../hooks/useSetlistCueMutations';
import { getCueTypeLabel } from '../utils/cueLabels';
import { formatCueClock } from '../utils/cueTimeline';
import { CuePriorityBadge } from './CuePriorityBadge';
import { CueStatusSelect } from './CueStatusSelect';

export function MyCuesPanel({
  organizationId,
  setlistId,
  items,
  cues,
  currentUserId,
}: {
  organizationId: string;
  setlistId: string;
  items: SetlistItem[];
  cues: SetlistCue[];
  currentUserId?: string;
}) {
  const itemTitleById = new Map(items.map((item) => [item.id, item.title]));
  const myCues = cues
    .filter((cue) => cue.responsibleParticipant?.membership.user.id === currentUserId)
    .sort((a, b) => (a.timelinePositionSec ?? 0) - (b.timelinePositionSec ?? 0));

  const statusMutation = useUpdateSetlistCueStatus(organizationId, setlistId);

  if (myCues.length === 0) {
    return <p className="text-xs text-muted">No tienes cues asignados en este setlist.</p>;
  }

  return (
    <div className="space-y-2">
      {myCues.map((cue) => (
        <div key={cue.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#1b2c40] px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {cue.setlistItemId ? itemTitleById.get(cue.setlistItemId) || 'Item' : 'General'} · {getCueTypeLabel(cue.type)}
            </p>
            <p className="text-xs text-muted">
              {cue.timelinePositionSec != null ? formatCueClock(cue.timelinePositionSec) : '--'} · <CuePriorityBadge priority={cue.priority} />
            </p>
          </div>
          <div className="w-40 shrink-0">
            <CueStatusSelect
              value={cue.status}
              onChange={(status) => statusMutation.mutate({ cueId: cue.id, itemId: cue.setlistItemId, input: { status } })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
