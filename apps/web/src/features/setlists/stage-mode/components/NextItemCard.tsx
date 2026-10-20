import type { SetlistItem } from '../../../../shared/types';
import { formatBpm, formatDuration, formatKey } from '../../../../shared/utils/format';

export function NextItemCard({ item }: { item: SetlistItem | null }) {
  if (!item) return null;

  return (
    <div className="rounded-lg border border-[#30333A] bg-[#1A1B1F] px-4 py-3 text-center">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--primary)]">Siguiente</p>
      <p className="mt-1 truncate text-lg font-bold text-white">{item.title}</p>
      <p className="text-xs text-muted">
        {formatKey(item.effective.key)} · {formatBpm(item.effective.bpm)} · {formatDuration(item.effective.durationSec)}
      </p>
    </div>
  );
}
