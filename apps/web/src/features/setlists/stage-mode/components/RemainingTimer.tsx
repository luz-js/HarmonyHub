import { formatElapsed } from '../utils/stageFormatting';

export function RemainingTimer({ remainingSec }: { remainingSec: number }) {
  return (
    <div className="text-center">
      <p className="text-[11px] uppercase tracking-wide text-muted">Restante</p>
      <p className="font-mono text-4xl font-bold tabular-nums text-[var(--primary)]">{formatElapsed(remainingSec)}</p>
    </div>
  );
}
