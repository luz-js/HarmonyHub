import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorkspaceTab } from '../utils/workspaceTabs';

const STORAGE_KEY = 'setlist-workspace-state';

type PerSetlistWorkspaceLayout = {
  expandedItemIds: string[];
  activeTabByItemId: Record<string, WorkspaceTab>;
  scrollTop: number;
};

type WorkspaceLayoutState = Record<string, PerSetlistWorkspaceLayout>;

const DEFAULT_LAYOUT: PerSetlistWorkspaceLayout = {
  expandedItemIds: [],
  activeTabByItemId: {},
  scrollTop: 0,
};

function readAll(): WorkspaceLayoutState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(state: WorkspaceLayoutState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage puede fallar (modo privado, cuota); el workspace sigue funcionando solo en memoria.
  }
}

/**
 * Persiste que canciones estan expandidas y su tab activa, por setlist, bajo
 * la clave `setlist-workspace-state`. Puramente local, nunca en el servidor.
 */
export function useSetlistWorkspaceLayout(setlistId: string) {
  const [layout, setLayout] = useState<PerSetlistWorkspaceLayout>(() => ({ ...DEFAULT_LAYOUT, ...readAll()[setlistId] }));
  const writeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLayout({ ...DEFAULT_LAYOUT, ...readAll()[setlistId] });
  }, [setlistId]);

  useEffect(
    () => () => {
      if (writeTimeout.current) clearTimeout(writeTimeout.current);
    },
    [],
  );

  const persist = useCallback(
    (next: PerSetlistWorkspaceLayout, debounceMs: number) => {
      if (writeTimeout.current) clearTimeout(writeTimeout.current);
      const write = () => {
        const all = readAll();
        all[setlistId] = next;
        writeAll(all);
      };
      if (debounceMs > 0) writeTimeout.current = setTimeout(write, debounceMs);
      else write();
    },
    [setlistId],
  );

  const toggleExpanded = useCallback(
    (itemId: string) =>
      setLayout((current) => {
        const has = current.expandedItemIds.includes(itemId);
        const next = {
          ...current,
          expandedItemIds: has ? current.expandedItemIds.filter((id) => id !== itemId) : [...current.expandedItemIds, itemId],
        };
        persist(next, 0);
        return next;
      }),
    [persist],
  );

  const collapse = useCallback(
    (itemId: string) =>
      setLayout((current) => {
        if (!current.expandedItemIds.includes(itemId)) return current;
        const next = { ...current, expandedItemIds: current.expandedItemIds.filter((id) => id !== itemId) };
        persist(next, 0);
        return next;
      }),
    [persist],
  );

  const setActiveTab = useCallback(
    (itemId: string, tab: WorkspaceTab) =>
      setLayout((current) => {
        const next = { ...current, activeTabByItemId: { ...current.activeTabByItemId, [itemId]: tab } };
        persist(next, 0);
        return next;
      }),
    [persist],
  );

  const setScrollTop = useCallback(
    (value: number) =>
      setLayout((current) => {
        const next = { ...current, scrollTop: value };
        persist(next, 200);
        return next;
      }),
    [persist],
  );

  return {
    expandedItemIds: new Set(layout.expandedItemIds),
    activeTabByItemId: layout.activeTabByItemId,
    scrollTop: layout.scrollTop,
    toggleExpanded,
    collapse,
    setActiveTab,
    setScrollTop,
  };
}
