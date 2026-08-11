import { formatElapsed } from '../utils/stageFormatting';

export function ElapsedTimer({ elapsedSec }: { elapsedSec: number }) {
  return (
    <div className="text-center">
      <p className="text-[11px] uppercase tracking-wide text-muted">Transcurrido</p>
      <p className="font-mono text-2xl font-bold tabular-nums text-white">{formatElapsed(elapsedSec)}</p>
    </div>
  );
}
