import { useEffect, useMemo, useState } from 'react';
import type { DragStartEvent } from '@dnd-kit/core';
import { closestCenter, DndContext, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { SetlistItem } from '../../../../shared/types';
import type { TimelineEntry } from '../utils/calculateTimeline';
import { groupVisibleItems } from '../utils/groupVisibleItems';
import { useSetlistDnD } from '../hooks/useSetlistDnD';
import { ExpandedSongWorkspace } from '../../workspace/components/ExpandedSongWorkspace';
import { ResourceBadges } from '../../workspace/components/ResourceBadges';
import type { WorkspaceTab } from '../../workspace/utils/workspaceTabs';
import { useSetlistTeam } from '../../assignments/hooks/useSetlistTeam';
import { buildTeamSummary } from '../../assignments/utils/teamSummary';
import { useSetlistProduction } from '../../cues/hooks/useSetlistProduction';
import { buildCuesSummaryByItem } from '../../cues/utils/cuesSummary';
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
  expandedItemIds,
  activeTabByItemId,
  onToggleExpand,
  onCollapse,
  onTabChange,
}: {
  organizationId: string;
  setlistId: string;
  items: SetlistItem[];
  timeline: TimelineEntry[];
  selectedItemId: string | null;
  onSelect: (id: string) => void;
  collapsedGroupIds: Set<string>;
  onToggleGroup: (groupId: string) => void;
  expandedItemIds: Set<string>;
  activeTabByItemId: Record<string, WorkspaceTab>;
  onToggleExpand: (id: string) => void;
  onCollapse: (id: string) => void;
  onTabChange: (id: string, tab: WorkspaceTab) => void;
}) {
  const dnd = useSetlistDnD(organizationId, setlistId, items);
  const teamQuery = useSetlistTeam(organizationId, setlistId);
  const teamSummaryByItemId = useMemo(() => {
    const entries = teamQuery.data?.items ?? [];
    return new Map(entries.map((entry) => [entry.itemId, buildTeamSummary(entry)]));
  }, [teamQuery.data]);
  const productionQuery = useSetlistProduction(organizationId, setlistId);
  const cuesSummaryByItemId = useMemo(() => buildCuesSummaryByItem(productionQuery.data?.cues ?? []), [productionQuery.data]);

  function handleDragStart(event: DragStartEvent) {
    onCollapse(String(event.active.id));
    dnd.handleDragStart(event);
  }

  // Solo en memoria (no persistido): una vez expandida, una cancion conserva sus badges
  // de recursos aunque se vuelva a colapsar. Nunca se piden recursos de canciones que
  // nunca fueron expandidas.
  const [everExpandedIds, setEverExpandedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    setEverExpandedIds((current) => {
      let changed = false;
      const next = new Set(current);
      expandedItemIds.forEach((id) => {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [expandedItemIds]);

  const timelineByItemId = useMemo(() => new Map(timeline.map((entry) => [entry.itemId, entry.startSec])), [timeline]);
  const indexById = useMemo(() => new Map(items.map((item, index) => [item.id, index])), [items]);

  // Mientras se arrastra, se desactiva el colapso para permitir soltar sobre cualquier item real.
  const effectiveCollapsedIds = dnd.activeId ? new Set<string>() : collapsedGroupIds;
  const groupedEntries = useMemo(() => groupVisibleItems(items, effectiveCollapsedIds), [items, effectiveCollapsedIds]);

  return (
    <DndContext
      sensors={dnd.sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
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
            const isExpanded = expandedItemIds.has(item.id);
            const activeTab = activeTabByItemId[item.id] ?? 'lyrics';
            const workspaceId = `setlist-workspace-${item.id}`;

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
                <SetlistCard
                  item={item}
                  startSec={timelineByItemId.get(item.id) ?? 0}
                  isSelected={selectedItemId === item.id}
                  onSelect={onSelect}
                  isExpanded={isExpanded}
                  onToggleExpand={onToggleExpand}
                  workspaceId={workspaceId}
                  teamSummary={teamSummaryByItemId.get(item.id)}
                  cuesSummary={cuesSummaryByItemId.get(item.id)}
                />
                {item.type === 'SONG' && !isExpanded && everExpandedIds.has(item.id) && item.songId && (
                  <div className="ml-9 mt-0.5">
                    <ResourceBadges organizationId={organizationId} songId={item.songId} />
                  </div>
                )}
                {item.type === 'SONG' && isExpanded && (
                  <ExpandedSongWorkspace
                    id={workspaceId}
                    item={item}
                    activeTab={activeTab}
                    onTabChange={(tab) => onTabChange(item.id, tab)}
                  />
                )}
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
