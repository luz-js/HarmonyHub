import { useStageClock } from '../hooks/useStageClock';
import { formatLiveClock } from '../utils/stageFormatting';

export function LiveClock({ format }: { format: '12' | '24' }) {
  const now = useStageClock();
  return <span className="font-mono tabular-nums">{formatLiveClock(now, format)}</span>;
}
