import type { ReactNode } from 'react';
import { Settings, X } from 'lucide-react';
import { LiveClock } from './LiveClock';

export function StageTopBar({
  name,
  showClock,
  clockFormat,
  onOpenSettings,
  onExit,
  live,
}: {
  name: string;
  /** Controles del modo en vivo (opcional). */
  live?: ReactNode;
  showClock: boolean;
  clockFormat: '12' | '24';
  onOpenSettings: () => void;
  onExit: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <p className="truncate text-sm font-semibold text-white">{name}</p>
        {live}
      </div>
      <div className="flex items-center gap-3 text-sm text-muted">
        {showClock && <LiveClock format={clockFormat} />}
        <button type="button" className="btn-ghost h-8 w-8 p-0" aria-label="Ajustes de Stage Mode" onClick={onOpenSettings}>
          <Settings className="h-4 w-4" />
        </button>
        <button type="button" className="btn-ghost h-8 w-8 p-0" aria-label="Salir de Stage Mode" onClick={onExit}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
