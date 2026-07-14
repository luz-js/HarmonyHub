import type { SetlistItem, SetlistItemType } from '../../../../shared/types';

export type GroupedEntry =
  | { kind: 'item'; item: SetlistItem; groupId?: string; groupSize?: number; isGroupStart?: boolean }
  | { kind: 'group'; id: string; type: SetlistItemType; items: SetlistItem[] };

function buildGroupId(run: SetlistItem[]): string {
  return `group:${run[0].id}:${run[run.length - 1].id}`;
}

/**
 * Agrupa runs consecutivos (>=2) del mismo tipo. Solo se renderiza como grupo colapsado
 * ("5 canciones") si su id esta en `collapsedGroupIds`; de lo contrario se listan los items
 * individuales con metadata de grupo para permitir colapsar desde la UI. Puramente visual:
 * nunca reordena ni muta items.
 */
export function groupVisibleItems(items: SetlistItem[], collapsedGroupIds: Set<string>): GroupedEntry[] {
  const entries: GroupedEntry[] = [];
  let i = 0;

  while (i < items.length) {
    let j = i + 1;
    while (j < items.length && items[j].type === items[i].type) j++;
    const run = items.slice(i, j);

    if (run.length >= 2) {
      const groupId = buildGroupId(run);
      if (collapsedGroupIds.has(groupId)) {
        entries.push({ kind: 'group', id: groupId, type: run[0].type, items: run });
      } else {
        run.forEach((item, index) => {
          entries.push({ kind: 'item', item, groupId, groupSize: run.length, isGroupStart: index === 0 });
        });
      }
    } else {
      entries.push({ kind: 'item', item: run[0] });
    }

    i = j;
  }

  return entries;
}
