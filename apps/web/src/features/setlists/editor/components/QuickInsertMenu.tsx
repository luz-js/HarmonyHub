import type { SetlistItemType } from '../../../../shared/types';
import { SETLIST_ITEM_TYPE_OPTIONS } from '../../utils';

export function QuickInsertMenu({ onPick }: { onPick: (type: SetlistItemType) => void }) {
  return (
    <div className="absolute left-1/2 top-full z-20 mt-1 w-48 -translate-x-1/2 rounded-lg border border-[#30333A] bg-[#23252A] p-1 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
      {SETLIST_ITEM_TYPE_OPTIONS.map(([type, label]) => (
        <button
          key={type}
          type="button"
          className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-white hover:bg-white/[0.06]"
          onClick={() => onPick(type)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
