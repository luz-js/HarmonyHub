import { useEffect, useState } from 'react';
import { deriveElapsedSec, deriveRemainingSec } from '../utils/stageTiming.utils';
import type { PerSetlistStageState } from './useStagePersistence';

/** Temporizador simple: no crea un cronometro complejo, solo deriva elapsed/remaining de timestamps. */
export function useStageTimers(
  state: PerSetlistStageState,
  update: (patch: Partial<PerSetlistStageState>) => void,
  totalEffectiveSec: number,
) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!state.isRunning) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [state.isRunning]);

  const elapsedSec = deriveElapsedSec({ isRunning: state.isRunning, startedAt: state.startedAt, accumulatedSec: state.accumulatedSec }, now);
  const remainingSec = deriveRemainingSec(elapsedSec, totalEffectiveSec);

  function play() {
    if (state.isRunning) return;
    update({ isRunning: true, startedAt: Date.now(), pausedAt: null });
  }

  function pause() {
    if (!state.isRunning) return;
    const frozenElapsed = deriveElapsedSec(
      { isRunning: true, startedAt: state.startedAt, accumulatedSec: state.accumulatedSec },
      Date.now(),
    );
    update({ isRunning: false, startedAt: null, pausedAt: Date.now(), accumulatedSec: frozenElapsed });
  }

  function togglePlay() {
    if (state.isRunning) pause();
    else play();
  }

  function reset() {
    update({ isRunning: false, startedAt: null, pausedAt: null, accumulatedSec: 0 });
  }

  return { elapsedSec, remainingSec, isRunning: state.isRunning, play, pause, togglePlay, reset };
}
