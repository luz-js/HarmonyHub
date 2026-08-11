import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'stage-mode-state';

export type StageLayout = 'SONG_ONLY' | 'SONG_LYRICS' | 'SONG_LYRICS_NEXT' | 'PRODUCTION' | 'CLEAN';

export type PerSetlistStageState = {
  currentItemId: string | null;
  currentCueId: string | null;
  layout: StageLayout;
  zoom: number;
  clockFormat: '12' | '24';
  showLyrics: boolean;
  showCues: boolean;
  showPrevious: boolean;
  showNext: boolean;
  showClock: boolean;
  showProgress: boolean;
  showBpm: boolean;
  showKey: boolean;
  showChords: boolean;
  showResponsibles: boolean;
  isRunning: boolean;
  startedAt: number | null;
  pausedAt: number | null;
  accumulatedSec: number;
};

type StageStorageState = Record<string, PerSetlistStageState>;

export const DEFAULT_STAGE_STATE: PerSetlistStageState = {
  currentItemId: null,
  currentCueId: null,
  layout: 'SONG_LYRICS',
  zoom: 18,
  clockFormat: '24',
  showLyrics: true,
  showCues: true,
  showPrevious: true,
  showNext: true,
  showClock: true,
  showProgress: true,
  showBpm: true,
  showKey: true,
  showChords: true,
  showResponsibles: true,
  isRunning: false,
  startedAt: null,
  pausedAt: null,
  accumulatedSec: 0,
};

function readAll(): StageStorageState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(state: StageStorageState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage puede fallar (modo privado, cuota); Stage Mode sigue funcionando solo en memoria.
  }
}

/**
 * Persiste el estado de Stage Mode puramente local (nunca en el servidor), por setlist, bajo la
 * clave `stage-mode-state` — mismo patron exacto que `useSetlistEditorLayout`. En vez de un setter
 * por campo (serian 19), expone un unico `update(patch, debounceMs?)` generico: el numero de campos
 * aqui hace que 19 setters casi identicos sean la abstraccion equivocada.
 */
export function useStagePersistence(setlistId: string) {
  const [state, setState] = useState<PerSetlistStageState>(() => ({ ...DEFAULT_STAGE_STATE, ...readAll()[setlistId] }));
  const writeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setState({ ...DEFAULT_STAGE_STATE, ...readAll()[setlistId] });
  }, [setlistId]);

  useEffect(
    () => () => {
      if (writeTimeout.current) clearTimeout(writeTimeout.current);
    },
    [],
  );

  const persist = useCallback(
    (next: PerSetlistStageState, debounceMs: number) => {
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

  const update = useCallback(
    (patch: Partial<PerSetlistStageState>, debounceMs = 0) => {
      setState((current) => {
        const next = { ...current, ...patch };
        persist(next, debounceMs);
        return next;
      });
    },
    [persist],
  );

  return { state, update };
}
