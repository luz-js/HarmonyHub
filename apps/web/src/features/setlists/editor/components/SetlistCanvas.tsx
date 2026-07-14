import { useMemo } from 'react';
import { closestCenter, DndContext, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { SetlistItem } from '../../../../shared/types';
import type { TimelineEntry } from '../utils/calculateTimeline';
import { groupVisibleItems } from '../utils/groupVisibleItems';
import { useSetlistDnD } from '../hooks/useSetlistDnD';
import { CollapsedGroup } from './CollapsedGroup';
import { QuickInsertBar } from './QuickInsertBar';
import { SetlistCard } from './SetlistCard';
import { SetlistDragOverlay } from './SetlistDragOverlay';
import { SetlistDropZone } from './SetlistDropZone';

export function SetlistCanvas({
  organizationId,
  setlistId,
  items,
  timeline,
  selectedItemId,
  onSelect,
  collapsedGroupIds,
  onToggleGroup,
}: {
  organizationId: string;
  setlistId: string;
  items: SetlistItem[];
  timeline: TimelineEntry[];
  selectedItemId: string | null;
  onSelect: (id: string) => void;
  collapsedGroupIds: Set<string>;
  onToggleGroup: (groupId: string) => void;
}) {
  const dnd = useSetlistDnD(organizationId, setlistId, items);

  const timelineByItemId = useMemo(() => new Map(timeline.map((entry) => [entry.itemId, entry.startSec])), [timeline]);
  const indexById = useMemo(() => new Map(items.map((item, index) => [item.id, index])), [items]);

  // Mientras se arrastra, se desactiva el colapso para permitir soltar sobre cualquier item real.
  const effectiveCollapsedIds = dnd.activeId ? new Set<string>() : collapsedGroupIds;
  const groupedEntries = useMemo(() => groupVisibleItems(items, effectiveCollapsedIds), [items, effectiveCollapsedIds]);

  return (
    <DndContext
      sensors={dnd.sensors}
      collisionDetection={closestCenter}
      onDragStart={dnd.handleDragStart}
      onDragOver={dnd.handleDragOver}
      onDragEnd={dnd.handleDragEnd}
      onDragCancel={dnd.handleDragCancel}
    >
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div>
          <QuickInsertBar index={0} organizationId={organizationId} setlistId={setlistId} />

          {groupedEntries.map((entry) => {
            if (entry.kind === 'group') {
              const lastItem = entry.items[entry.items.length - 1];
              const afterIndex = (indexById.get(lastItem.id) ?? -1) + 1;
              return (
                <div key={entry.id}>
                  <CollapsedGroup type={entry.type} items={entry.items} onExpand={() => onToggleGroup(entry.id)} />
                  <QuickInsertBar index={afterIndex} organizationId={organizationId} setlistId={setlistId} />
                </div>
              );
            }

            const { item } = entry;
            const afterIndex = (indexById.get(item.id) ?? -1) + 1;

            return (
              <div key={item.id}>
                {entry.isGroupStart && entry.groupId && (
                  <button
                    type="button"
                    className="mb-0.5 ml-9 text-[11px] text-faint hover:text-muted"
                    onClick={() => onToggleGroup(entry.groupId!)}
                  >
                    Colapsar {entry.groupSize} items similares
                  </button>
                )}
                <SetlistDropZone active={dnd.overId === item.id} />
                <SetlistCard item={item} startSec={timelineByItemId.get(item.id) ?? 0} isSelected={selectedItemId === item.id} onSelect={onSelect} />
                <QuickInsertBar index={afterIndex} organizationId={organizationId} setlistId={setlistId} />
              </div>
            );
          })}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'ease-out' }}>
        {dnd.activeItem ? <SetlistDragOverlay item={dnd.activeItem} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
