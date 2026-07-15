import { Music2, Speaker, StickyNote, Volume2 } from 'lucide-react';
import type { SetlistItem } from '../../../../shared/types';
import { formatBpm, formatDuration, formatKey } from '../../../../shared/utils/format';
import { TeamSummaryRow } from '../../assignments/components/TeamSummaryRow';
import type { TeamSummary } from '../../assignments/utils/teamSummary';

export function SongSetlistCard({ item, teamSummary }: { item: SetlistItem; teamSummary?: TeamSummary | null }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#1b2c40] bg-[#0a1420]">
        {item.song?.coverUrl ? (
          <img src={item.song.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Music2 className="h-4 w-4 text-[var(--primary)]" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">{item.title}</p>
        <p className="truncate text-xs text-muted">
          {item.song?.artist} {item.songVersion?.name ? `· ${item.songVersion.name}` : ''}
        </p>
        {item.internalNote && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-faint">
            <StickyNote className="h-3 w-3 shrink-0" /> {item.internalNote}
          </p>
        )}
        <TeamSummaryRow summary={teamSummary ?? null} />
      </div>

      <div className="flex shrink-0 items-center gap-2 text-xs text-muted">
        {item.capo != null && <span className="badge">Capo {item.capo}</span>}
        {item.includeClick && (
          <span className="badge" title="Click">
            <Volume2 className="h-3 w-3" />
          </span>
        )}
        {item.includePad && (
          <span className="badge" title="Pad">
            <Speaker className="h-3 w-3" />
          </span>
        )}
        <span className="badge badge-primary">{formatKey(item.effective.key)}</span>
        <span>{formatBpm(item.effective.bpm)}</span>
        <span>{formatDuration(item.effective.durationSec)}</span>
      </div>
    </div>
  );
}
