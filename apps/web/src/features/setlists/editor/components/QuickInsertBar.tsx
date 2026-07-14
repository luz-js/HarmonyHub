import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { SetlistItemType } from '../../../../shared/types';
import { AddSetlistItemDialog } from '../../components/AddSetlistItemDialog';
import { getSetlistItemTypeLabel } from '../../utils';
import { useQuickInsertItem } from '../hooks/useQuickInsertItem';
import { QuickInsertMenu } from './QuickInsertMenu';

/** Boton "+" entre cards; inserta exactamente en esa posicion (nunca al final). */
export function QuickInsertBar({ index, organizationId, setlistId }: { index: number; organizationId: string; setlistId: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [songDialogOpen, setSongDialogOpen] = useState(false);
  const quickInsert = useQuickInsertItem(organizationId, setlistId);

  function handlePick(type: SetlistItemType) {
    setMenuOpen(false);
    if (type === 'SONG') {
      setSongDialogOpen(true);
      return;
    }
    quickInsert.mutate({ input: { type, title: getSetlistItemTypeLabel(type) }, insertIndex: index });
  }

  return (
    <div className="group/insert relative flex justify-center" onKeyDown={(event) => event.key === 'Escape' && setMenuOpen(false)}>
      <button
        type="button"
        className="btn-ghost flex h-6 w-6 items-center justify-center rounded-full p-0 opacity-0 transition-opacity group-hover/insert:opacity-100 focus-visible:opacity-100"
        aria-label="Agregar item aqui"
        onClick={() => setMenuOpen((value) => !value)}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>

      {menuOpen && (
        <>
          <button type="button" aria-label="Cerrar menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} />
          <QuickInsertMenu onPick={handlePick} />
        </>
      )}

      {songDialogOpen && (
        <AddSetlistItemDialog organizationId={organizationId} setlistId={setlistId} insertIndex={index} onClose={() => setSongDialogOpen(false)} />
      )}
    </div>
  );
}
