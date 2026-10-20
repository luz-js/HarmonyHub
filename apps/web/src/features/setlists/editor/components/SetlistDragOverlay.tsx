import type { SetlistItem } from '../../../../shared/types';
import { buildDragPreview } from '../utils/buildDragPreview';

/** Tarjeta flotante mientras se arrastra un item — nunca un rectangulo vacio. */
export function SetlistDragOverlay({ item }: { item: SetlistItem }) {
  const preview = buildDragPreview(item);
  const Icon = preview.icon;

  return (
    <div className="flex w-80 cursor-grabbing items-center gap-3 rounded-xl border border-[#30333A] bg-[#23252A] px-4 py-3 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
      <span className="icon-tile h-9 w-9 shrink-0">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">{preview.title}</p>
        <p className="truncate text-xs text-muted">{preview.subtitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs text-muted">
        {preview.keyLabel && <span className={`badge ${preview.badgeClass}`}>{preview.keyLabel}</span>}
        {preview.bpmLabel && <span>{preview.bpmLabel}</span>}
        <span>{preview.durationLabel}</span>
      </div>
    </div>
  );
}
