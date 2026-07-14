import type { SetlistItem } from '../../../../shared/types';
import { formatDuration } from '../../../../shared/utils/format';
import { OverlayDialog } from '../../../../shared/components/OverlayDialog';
import { calculateRunningTimeline } from '../utils/calculateTimeline';

function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

/** Vista previa de solo lectura: la corrida del evento, no una lista de registros. */
export function SetlistPreviewDialog({ name, items, onClose }: { name: string; items: SetlistItem[]; onClose: () => void }) {
  const timeline = calculateRunningTimeline(items);
  const timelineByItemId = new Map(timeline.map((entry) => [entry.itemId, entry.startSec]));
  const visibleItems = items.filter((item) => !item.isHidden);

  return (
    <OverlayDialog title={name} subtitle="Vista previa de la corrida del evento" onClose={onClose}>
      <div className="max-h-[60vh] space-y-3 overflow-y-auto">
        {visibleItems.map((item) => (
          <div key={item.id} className="flex items-center gap-4 border-b border-[#1b2c40] pb-3 last:border-0">
            <span className="w-14 shrink-0 font-mono text-sm text-[var(--primary)]">{formatClock(timelineByItemId.get(item.id) ?? 0)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{item.title}</p>
              {item.type === 'SONG' && (
                <p className="truncate text-xs text-muted">
                  {item.songVersion?.name} · {item.effective.key || '-'} · {item.effective.bpm ? `${item.effective.bpm} BPM` : '-'}
                </p>
              )}
            </div>
            <span className="shrink-0 text-xs text-muted">{formatDuration(item.effective.durationSec)}</span>
          </div>
        ))}
        {visibleItems.length === 0 && <p className="text-sm text-muted">No hay items visibles para previsualizar.</p>}
      </div>
    </OverlayDialog>
  );
}
