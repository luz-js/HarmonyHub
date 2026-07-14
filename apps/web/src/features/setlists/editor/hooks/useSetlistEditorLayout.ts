import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'setlist-editor-layout';

type PerSetlistLayout = {
  inspectorOpen: boolean;
  selectedItemId: string | null;
  scrollTop: number;
  collapsedGroupIds: string[];
};

type LayoutState = Record<string, PerSetlistLayout>;

const DEFAULT_LAYOUT: PerSetlistLayout = {
  inspectorOpen: false,
  selectedItemId: null,
  scrollTop: 0,
  collapsedGroupIds: [],
};

function readAll(): LayoutState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(state: LayoutState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage puede fallar (modo privado, cuota); el editor sigue funcionando solo en memoria.
  }
}

/**
 * Persiste estado de UI puramente local (nunca en el servidor ni en React Query),
 * por setlist, bajo la clave `setlist-editor-layout`. No se comparte entre usuarios.
 */
export function useSetlistEditorLayout(setlistId: string) {
  const [layout, setLayout] = useState<PerSetlistLayout>(() => ({ ...DEFAULT_LAYOUT, ...readAll()[setlistId] }));
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
    (next: PerSetlistLayout, debounceMs: number) => {
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

  const setInspectorOpen = useCallback(
    (value: boolean) =>
      setLayout((current) => {
        const next = { ...current, inspectorOpen: value };
        persist(next, 0);
        return next;
      }),
    [persist],
  );

  const setSelectedItemId = useCallback(
    (value: string | null) =>
      setLayout((current) => {
        const next = { ...current, selectedItemId: value };
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

  const toggleGroupCollapsed = useCallback(
    (groupId: string) =>
      setLayout((current) => {
        const has = current.collapsedGroupIds.includes(groupId);
        const next = {
          ...current,
          collapsedGroupIds: has ? current.collapsedGroupIds.filter((id) => id !== groupId) : [...current.collapsedGroupIds, groupId],
        };
        persist(next, 0);
        return next;
      }),
    [persist],
  );

  return {
    inspectorOpen: layout.inspectorOpen,
    selectedItemId: layout.selectedItemId,
    scrollTop: layout.scrollTop,
    collapsedGroupIds: new Set(layout.collapsedGroupIds),
    setInspectorOpen,
    setSelectedItemId,
    setScrollTop,
    toggleGroupCollapsed,
  };
}
