import type { PerSetlistStageState } from '../hooks/useStagePersistence';

const TOGGLES: Array<{ key: keyof PerSetlistStageState; label: string }> = [
  { key: 'showClock', label: 'Mostrar reloj' },
  { key: 'showNext', label: 'Mostrar siguiente' },
  { key: 'showPrevious', label: 'Mostrar anterior' },
  { key: 'showBpm', label: 'Mostrar BPM' },
  { key: 'showKey', label: 'Mostrar tonalidad' },
  { key: 'showChords', label: 'Mostrar acordes' },
  { key: 'showLyrics', label: 'Mostrar letra' },
  { key: 'showResponsibles', label: 'Mostrar responsables' },
  { key: 'showCues', label: 'Mostrar cues' },
  { key: 'showProgress', label: 'Mostrar progreso' },
];

export function StageSettings({
  state,
  update,
}: {
  state: PerSetlistStageState;
  update: (patch: Partial<PerSetlistStageState>, debounceMs?: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <span className="label">Formato de reloj</span>
        <div className="mt-1 flex gap-2">
          <button
            type="button"
            className={state.clockFormat === '12' ? 'btn-primary h-8 px-3 text-xs' : 'btn-ghost h-8 px-3 text-xs'}
            onClick={() => update({ clockFormat: '12' })}
          >
            12h
          </button>
          <button
            type="button"
            className={state.clockFormat === '24' ? 'btn-primary h-8 px-3 text-xs' : 'btn-ghost h-8 px-3 text-xs'}
            onClick={() => update({ clockFormat: '24' })}
          >
            24h
          </button>
        </div>
      </div>

      <label className="block">
        <span className="label">Zoom de letra ({state.zoom}px)</span>
        <input
          type="range"
          min={12}
          max={40}
          step={1}
          value={state.zoom}
          onChange={(event) => update({ zoom: Number(event.target.value) }, 150)}
          className="mt-1 w-full accent-[var(--primary)]"
        />
      </label>

      <div className="space-y-2">
        {TOGGLES.map((toggle) => (
          <label key={toggle.key} className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={Boolean(state[toggle.key])} onChange={(event) => update({ [toggle.key]: event.target.checked })} />
            {toggle.label}
          </label>
        ))}
      </div>
    </div>
  );
}
