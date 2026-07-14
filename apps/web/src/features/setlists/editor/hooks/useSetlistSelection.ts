import { useCallback, useMemo } from 'react';
import type { KeyboardEvent } from 'react';
import type { SetlistItem } from '../../../../shared/types';

/** Seleccion unica (no hay multiseleccion en esta fase) + atajos de teclado Escape/Delete. */
export function useSetlistSelection({
  items,
  selectedItemId,
  setSelectedItemId,
  onDeleteSelected,
}: {
  items: SetlistItem[];
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  onDeleteSelected?: (item: SetlistItem) => void;
}) {
  const selectedItem = useMemo(() => items.find((item) => item.id === selectedItemId) ?? null, [items, selectedItemId]);

  const select = useCallback((id: string) => setSelectedItemId(id), [setSelectedItemId]);
  const clear = useCallback(() => setSelectedItemId(null), [setSelectedItemId]);
  const isSelected = useCallback((id: string) => id === selectedItemId, [selectedItemId]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Escape') {
        clear();
        return;
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedItem && onDeleteSelected) {
        event.preventDefault();
        onDeleteSelected(selectedItem);
      }
    },
    [clear, selectedItem, onDeleteSelected],
  );

  return { selectedItemId, selectedItem, isSelected, select, clear, handleKeyDown };
}
