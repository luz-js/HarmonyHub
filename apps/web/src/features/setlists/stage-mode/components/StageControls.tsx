import { ChevronLeft, ChevronRight, Maximize, Minimize, Pause, Play } from 'lucide-react';
import type { StageLayout } from '../hooks/useStagePersistence';

const LAYOUT_OPTIONS: Array<{ value: StageLayout; label: string }> = [
  { value: 'SONG_ONLY', label: 'Solo cancion' },
  { value: 'SONG_LYRICS', label: 'Cancion + letra' },
  { value: 'SONG_LYRICS_NEXT', label: 'Cancion + letra + siguiente' },
  { value: 'PRODUCTION', label: 'Produccion' },
  { value: 'CLEAN', label: 'Pantalla limpia' },
];

export function StageControls({
  isRunning,
  isFullscreen,
  layout,
  onPrevious,
  onTogglePlay,
  onNext,
  onToggleFullscreen,
  onChangeLayout,
}: {
  isRunning: boolean;
  isFullscreen: boolean;
  layout: StageLayout;
  onPrevious: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onToggleFullscreen: () => void;
  onChangeLayout: (layout: StageLayout) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button type="button" className="btn-ghost h-10 w-10 p-0" aria-label="Item anterior" onClick={onPrevious}>
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button type="button" className="btn-primary h-10 w-10 p-0" aria-label={isRunning ? 'Pausar' : 'Reproducir'} onClick={onTogglePlay}>
        {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </button>
      <button type="button" className="btn-ghost h-10 w-10 p-0" aria-label="Siguiente item" onClick={onNext}>
        <ChevronRight className="h-5 w-5" />
      </button>
      <button type="button" className="btn-ghost h-10 w-10 p-0" aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'} onClick={onToggleFullscreen}>
        {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
      </button>
      <select
        className="select h-10 text-xs"
        value={layout}
        onChange={(event) => onChangeLayout(event.target.value as StageLayout)}
        aria-label="Layout"
      >
        {LAYOUT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
