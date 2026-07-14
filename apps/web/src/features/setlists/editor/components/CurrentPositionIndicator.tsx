function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

/** Marca la hora de inicio estimada de un item (timeline calculado, no persistido). */
export function CurrentPositionIndicator({ startSec }: { startSec: number }) {
  return <span className="w-12 shrink-0 text-right font-mono text-[11px] text-faint">{formatClock(startSec)}</span>;
}
