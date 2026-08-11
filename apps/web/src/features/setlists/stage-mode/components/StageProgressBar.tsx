export function StageProgressBar({ ratio }: { ratio: number }) {
  const percent = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-[var(--primary)] transition-[width]" style={{ width: `${percent}%` }} />
    </div>
  );
}
