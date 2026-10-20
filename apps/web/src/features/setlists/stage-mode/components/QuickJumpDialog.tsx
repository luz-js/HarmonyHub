import { useMemo, useState } from 'react';
import { Music2, Search, Tag } from 'lucide-react';
import type { SetlistCue, SetlistItem } from '../../../../shared/types';
import { OverlayDialog } from '../../../../shared/components/OverlayDialog';
import { getCueTypeLabel } from '../../cues/utils/cueLabels';

export function QuickJumpDialog({
  items,
  cues,
  onSelectItem,
  onSelectCue,
  onClose,
}: {
  items: SetlistItem[];
  cues: SetlistCue[];
  onSelectItem: (itemId: string) => void;
  onSelectCue: (cueId: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => item.title.toLowerCase().includes(term));
  }, [items, search]);

  const filteredCues = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return cues;
    return cues.filter((cue) => cue.title.toLowerCase().includes(term) || getCueTypeLabel(cue.type).toLowerCase().includes(term));
  }, [cues, search]);

  return (
    <OverlayDialog title="Ir a..." subtitle="Buscar canción, bloque o cue" onClose={onClose}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        <input autoFocus className="input pl-8" placeholder="Buscar..." value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>

      <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-white hover:bg-white/[0.06]"
            onClick={() => {
              onSelectItem(item.id);
              onClose();
            }}
          >
            <Music2 className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
            <span className="truncate">{item.title}</span>
          </button>
        ))}
        {filteredCues.map((cue) => (
          <button
            key={cue.id}
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-white hover:bg-white/[0.06]"
            onClick={() => {
              onSelectCue(cue.id);
              onClose();
            }}
          >
            <Tag className="h-3.5 w-3.5 shrink-0 text-muted" />
            <span className="truncate">
              {cue.title} <span className="text-xs text-muted">· {getCueTypeLabel(cue.type)}</span>
            </span>
          </button>
        ))}
        {filteredItems.length === 0 && filteredCues.length === 0 && <p className="px-2 py-3 text-xs text-muted">Sin resultados.</p>}
      </div>
    </OverlayDialog>
  );
}
