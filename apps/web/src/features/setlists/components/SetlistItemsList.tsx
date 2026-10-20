import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { SetlistItem } from '../../../shared/types';
import { useDeleteSetlistItem, useDuplicateSetlistItem, useReorderSetlistItems, useUpdateSetlistItem } from '../hooks';
import { swapItemOrder } from '../utils';
import { AddSetlistItemDialog } from './AddSetlistItemDialog';
import { EditSetlistItemDialog } from './EditSetlistItemDialog';
import { SetlistEmptyState } from './SetlistEmptyState';
import { SetlistItemRow } from './SetlistItemRow';

export function SetlistItemsList({
  organizationId,
  setlistId,
  items,
  canManage,
}: {
  organizationId: string;
  setlistId: string;
  items: SetlistItem[];
  canManage: boolean;
}) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<SetlistItem | null>(null);

  const updateMutation = useUpdateSetlistItem(organizationId, setlistId);
  const deleteMutation = useDeleteSetlistItem(organizationId, setlistId);
  const duplicateMutation = useDuplicateSetlistItem(organizationId, setlistId);
  const reorderMutation = useReorderSetlistItems(organizationId, setlistId);

  function move(index: number, direction: 'up' | 'down') {
    reorderMutation.mutate(swapItemOrder(items, index, direction));
  }

  async function handleDelete(item: SetlistItem) {
    if (!window.confirm(`¿Quitar "${item.title}" del setlist?`)) return;
    await deleteMutation.mutateAsync(item.id);
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Contenido del setlist</h2>
        {canManage && <button className="btn-primary" onClick={() => setShowAddDialog(true)}><Plus className="h-4 w-4" /> Agregar item</button>}
      </div>

      {items.length === 0 ? (
        <SetlistEmptyState
          title="Este setlist todavía no tiene canciones ni bloques."
          subtitle="Agrega canciones desde tu catálogo o bloques como oración, avisos o transiciones."
          action={canManage ? <button className="btn-primary" onClick={() => setShowAddDialog(true)}><Plus className="h-4 w-4" /> Agregar item</button> : undefined}
        />
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <SetlistItemRow
              key={item.id}
              item={item}
              index={index}
              total={items.length}
              canManage={canManage}
              onMoveUp={() => move(index, 'up')}
              onMoveDown={() => move(index, 'down')}
              onEdit={() => setEditingItem(item)}
              onDuplicate={() => void duplicateMutation.mutateAsync(item.id)}
              onDelete={() => void handleDelete(item)}
              onToggleHidden={() => void updateMutation.mutateAsync({ itemId: item.id, input: { isHidden: !item.isHidden } })}
            />
          ))}
        </div>
      )}

      {showAddDialog && (
        <AddSetlistItemDialog organizationId={organizationId} setlistId={setlistId} onClose={() => setShowAddDialog(false)} />
      )}

      {editingItem && (
        <EditSetlistItemDialog organizationId={organizationId} setlistId={setlistId} item={editingItem} onClose={() => setEditingItem(null)} />
      )}
    </section>
  );
}
