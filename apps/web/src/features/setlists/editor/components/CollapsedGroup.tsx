import { ChevronDown } from 'lucide-react';
import type { SetlistItem, SetlistItemType } from '../../../../shared/types';
import { calculateTotalDuration } from '../utils/calculateDurations';
import { getSetlistItemTypeLabel } from '../../utils';
import { formatDuration } from '../../../../shared/utils/format';
import { TYPE_ICONS } from '../utils/setlistItemTheme';

/** Resumen "5 canciones · 18:32" para un run consecutivo del mismo tipo. Solo UI: no muta datos. */
export function CollapsedGroup({ type, items, onExpand }: { type: SetlistItemType; items: SetlistItem[]; onExpand: () => void }) {
  const Icon = TYPE_ICONS[type];
  const totalSec = calculateTotalDuration(items.map((item) => ({ ...item, isHidden: false })));
  const label = type === 'SONG' ? `${items.length} canciones` : `${items.length} × ${getSetlistItemTypeLabel(type)}`;

  return (
    <button
      type="button"
      onClick={onExpand}
      className="flex w-full items-center gap-3 rounded-xl border border-dashed border-[#30333A] bg-[#141518] px-3 py-2.5 text-left hover:bg-white/[0.03]"
    >
      <span className="icon-tile h-8 w-8 shrink-0">
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 text-sm font-semibold text-muted">{label}</span>
      <span className="text-xs text-faint">{formatDuration(totalSec)}</span>
      <ChevronDown className="h-4 w-4 text-faint" />
    </button>
  );
}
