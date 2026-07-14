import { useMemo, useState } from 'react';
import type { SetlistStatus } from '../../../../shared/types';
import { AddSetlistItemDialog } from '../../components/AddSetlistItemDialog';
import { useDeleteSetlistItem, useSetlistItems } from '../../hooks';
import { calculateRunningTimeline } from '../utils/calculateTimeline';
import { useSetlistEditorLayout } from '../hooks/useSetlistEditorLayout';
import { useSetlistInspector } from '../hooks/useSetlistInspector';
import { useSetlistSelection } from '../hooks/useSetlistSelection';
import { EmptyDropArea } from './EmptyDropArea';
import { SetlistCanvas } from './SetlistCanvas';
import { SetlistInspector } from './SetlistInspector';
import { SetlistStatistics } from './SetlistStatistics';
import { SetlistToolbar } from './SetlistToolbar';

export function SetlistEditor({
  organizationId,
  setlistId,
  name,
  status,
  canManage,
  canPublish,
  publishing,
  onPublish,
}: {
  organizationId: string;
  setlistId: string;
  name: string;
  status: SetlistStatus;
  canManage: boolean;
  canPublish: boolean;
  publishing: boolean;
  onPublish: () => void;
}) {
  const itemsQuery = useSetlistItems(organizationId, setlistId);
  const items = useMemo(() => itemsQuery.data || [], [itemsQuery.data]);

  const layout = useSetlistEditorLayout(setlistId);
  const deleteMutation = useDeleteSetlistItem(organizationId, setlistId);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const selection = useSetlistSelection({
    items,
    selectedItemId: layout.selectedItemId,
    setSelectedItemId: layout.setSelectedItemId,
    onDeleteSelected: (item) => {
      if (!canManage) return;
      if (window.confirm(`Eliminar "${item.title}"?`)) {
        deleteMutation.mutate(item.id);
        layout.setSelectedItemId(null);
      }
    },
  });

  const inspector = useSetlistInspector({ inspectorOpen: layout.inspectorOpen, setInspectorOpen: layout.setInspectorOpen });

  const timeline = useMemo(() => calculateRunningTimeline(items), [items]);
  const selectedStartSec = selection.selectedItem ? (timeline.find((entry) => entry.itemId === selection.selectedItem?.id)?.startSec ?? null) : null;

  function handleSelect(id: string) {
    selection.select(id);
    inspector.open();
  }

  function handleCloseInspector() {
    inspector.close();
    selection.clear();
  }

  if (itemsQuery.isLoading) {
    return <section className="panel p-5 text-muted">Cargando editor...</section>;
  }

  return (
    <div className="space-y-4" onKeyDown={selection.handleKeyDown}>
      <SetlistToolbar
        name={name}
        status={status}
        items={items}
        canManage={canManage}
        canPublish={canPublish}
        publishing={publishing}
        onPublish={onPublish}
        onAdd={() => setAddDialogOpen(true)}
      />

      <SetlistStatistics items={items} selectedStartSec={selectedStartSec} />

      {items.length === 0 ? (
        <EmptyDropArea onAdd={() => setAddDialogOpen(true)} />
      ) : (
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1 space-y-0">
            <SetlistCanvas
              organizationId={organizationId}
              setlistId={setlistId}
              items={items}
              timeline={timeline}
              selectedItemId={selection.selectedItemId}
              onSelect={handleSelect}
              collapsedGroupIds={layout.collapsedGroupIds}
              onToggleGroup={layout.toggleGroupCollapsed}
            />
          </div>

          <SetlistInspector
            item={canManage ? selection.selectedItem : null}
            organizationId={organizationId}
            setlistId={setlistId}
            mode={inspector.mode}
            isOpen={inspector.isOpen}
            onClose={handleCloseInspector}
          />
        </div>
      )}

      {addDialogOpen && canManage && (
        <AddSetlistItemDialog organizationId={organizationId} setlistId={setlistId} onClose={() => setAddDialogOpen(false)} />
      )}
    </div>
  );
}
