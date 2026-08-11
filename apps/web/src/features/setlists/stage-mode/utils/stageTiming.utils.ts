export function calculateProgressRatio(elapsedSec: number, totalEffectiveSec: number): number {
  if (totalEffectiveSec <= 0) return 0;
  return Math.min(1, Math.max(0, elapsedSec / totalEffectiveSec));
}

export interface StageTimingSnapshot {
  isRunning: boolean;
  startedAt: number | null;
  accumulatedSec: number;
}

/**
 * Deriva el tiempo transcurrido a partir de timestamps (nunca se persiste un numero que se
 * desactualice): si esta corriendo, suma el tiempo acumulado congelado + lo transcurrido desde
 * `startedAt`; si esta pausado/detenido, es directamente el acumulado.
 */
export function deriveElapsedSec(snapshot: StageTimingSnapshot, now: number = Date.now()): number {
  if (snapshot.isRunning && snapshot.startedAt != null) {
    return snapshot.accumulatedSec + (now - snapshot.startedAt) / 1000;
  }
  return snapshot.accumulatedSec;
}

export function deriveRemainingSec(elapsedSec: number, totalEffectiveSec: number): number {
  return Math.max(0, totalEffectiveSec - elapsedSec);
}
