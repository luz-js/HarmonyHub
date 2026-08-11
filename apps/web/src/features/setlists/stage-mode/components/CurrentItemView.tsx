import type { SetlistItem } from '../../../../shared/types';
import { formatBpm, formatKey } from '../../../../shared/utils/format';
import { calculateProgressRatio } from '../utils/stageTiming.utils';
import { ElapsedTimer } from './ElapsedTimer';
import { RemainingTimer } from './RemainingTimer';
import { StageProgressBar } from './StageProgressBar';

export function CurrentItemView({
  item,
  elapsedSec,
  remainingSec,
  showKey,
  showBpm,
  showProgress,
}: {
  item: SetlistItem | null;
  elapsedSec: number;
  remainingSec: number;
  showKey: boolean;
  showBpm: boolean;
  showProgress: boolean;
}) {
  if (!item) {
    return <p className="text-center text-muted">Sin item seleccionado.</p>;
  }

  const totalSec = item.effective.durationSec ?? 0;
  const ratio = calculateProgressRatio(elapsedSec, totalSec);

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="text-3xl font-bold text-white sm:text-5xl">{item.title}</p>
      {(showKey || showBpm) && (
        <p className="text-lg text-muted sm:text-2xl">
          {showKey && formatKey(item.effective.key)}
          {showKey && showBpm && ' · '}
          {showBpm && formatBpm(item.effective.bpm)}
        </p>
      )}

      <div className="flex items-center gap-8">
        <ElapsedTimer elapsedSec={elapsedSec} />
        <RemainingTimer remainingSec={remainingSec} />
      </div>

      {showProgress && (
        <div className="w-full max-w-md">
          <StageProgressBar ratio={ratio} />
        </div>
      )}
    </div>
  );
}
