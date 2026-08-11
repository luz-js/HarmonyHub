import type { SetlistItem } from '../../../../shared/types';

/** Solo referencia — no es navegable, no muestra acciones. */
export function PreviousItemCard({ item }: { item: SetlistItem | null }) {
  if (!item) return null;

  return (
    <div className="rounded-lg border border-[#1b2c40] px-3 py-2 text-center opacity-60">
      <p className="text-[10px] uppercase tracking-wide text-muted">Anterior</p>
      <p className="truncate text-sm text-muted">{item.title}</p>
    </div>
  );
}
