import { FileAudio, FileText, GitBranch, Link2, MessageCircle, Music2, StickyNote } from 'lucide-react';
import type { SongActivity } from '../../../../shared/types';
import { activityIconGroup, formatActivityLine, formatHistoryDate } from './history.utils';

const ICON_BY_GROUP = {
  song: Music2,
  version: GitBranch,
  track: FileAudio,
  link: Link2,
  file: FileText,
  note: StickyNote,
  collab: MessageCircle,
} as const;

export function ActivityItem({ activity }: { activity: SongActivity }) {
  const Icon = ICON_BY_GROUP[activityIconGroup(activity.action)];
  return (
    <div className="flex gap-3 rounded-xl border border-[#30333A] bg-[#141518] p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#3D4048] bg-[#141518] text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white/90">{formatActivityLine(activity.actor?.name, activity.summary)}</p>
        <p className="mt-1 text-xs text-muted">
          {formatHistoryDate(activity.createdAt)}
          {activity.version && ` · ${activity.version.name}`}
        </p>
      </div>
    </div>
  );
}
