import { AlertTriangle, LoaderCircle, Pause, Play, Square, Volume2, Waves, Zap } from 'lucide-react';
import type { SetlistCue } from '../../../../shared/types';
import { getCueTypeLabel } from '../../cues/utils/cueLabels';
import { formatElapsed as formatClock } from '../utils/stageFormatting';
import { cueAudioAction } from './cueAudio';
import type { StageAudio } from './useStageAudio';

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <input
      type="range"
      min={0}
      max={1}
      step={0.01}
      value={value}
      aria-label={label}
      className="h-1.5 w-full cursor-pointer accent-[var(--primary)]"
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}

/**
 * Panel "Pistas" de Stage Mode (solo quien opera el audio): stems con volumen/mute/solo, maestro, transporte,
 * pad y click. Suena solo en este dispositivo.
 */
export function StageAudioPanel({ audio, currentCue }: { audio: StageAudio; currentCue: SetlistCue | null }) {
  if (!audio.armed) {
    return (
      <div className="space-y-3 text-sm text-[#D8D5CE]">
        <p>El audio suena solo en este dispositivo. Los navegadores piden un toque antes de reproducir sonido.</p>
        <p className="text-muted">Al activarlo, los cues de click, pad y pistas del item actual disparan el audio cuando avanzas.</p>
        <button type="button" className="btn-primary w-full" onClick={() => void audio.arm()}>
          <Volume2 className="h-4 w-4" /> Activar audio
        </button>
      </div>
    );
  }

  const cueAction = currentCue ? cueAudioAction(currentCue.type) : null;
  const ready = audio.tracks.filter((row) => row.status === 'ready').length;
  const loading = audio.tracks.some((row) => row.status === 'loading');

  return (
    <div className="space-y-5 text-sm">
      {cueAction && currentCue && (
        <button type="button" className="btn-ghost w-full justify-center" onClick={() => audio.runAction(cueAction)}>
          <Zap className="h-4 w-4" /> Disparar cue: {getCueTypeLabel(currentCue.type)}
        </button>
      )}

      <section className="space-y-2" aria-label="Transporte">
        <div className="flex items-center gap-2">
          <button type="button" className="btn-primary h-9 w-9 p-0" aria-label={audio.isPlaying ? 'Pausar pistas' : 'Reproducir pistas'} disabled={audio.tracks.length === 0} onClick={audio.isPlaying ? audio.pause : audio.play}>
            {audio.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button type="button" className="btn-ghost h-9 w-9 p-0" aria-label="Detener pistas" onClick={audio.stop}>
            <Square className="h-4 w-4" />
          </button>
          <span className="ml-auto font-mono text-xs text-[#D8D5CE]" aria-label="Posición">
            {formatClock(audio.position)} / {formatClock(audio.duration)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(audio.duration, 0.01)}
          step={0.1}
          value={Math.min(audio.position, audio.duration)}
          aria-label="Posición de las pistas"
          className="h-1.5 w-full cursor-pointer accent-[var(--primary)]"
          disabled={audio.duration === 0}
          onChange={(event) => audio.seek(Number(event.target.value))}
        />
        <label className="block space-y-1">
          <span className="text-xs text-muted">Maestro</span>
          <Slider label="Volumen maestro" value={audio.masterVolume} onChange={audio.setMasterVolume} />
        </label>
        <button type="button" className="btn-danger w-full justify-center" onClick={audio.stopAll}>
          <Square className="h-4 w-4" /> Detener todo
        </button>
      </section>

      {audio.message && <p className="text-xs text-[#E8C27A]">{audio.message}</p>}

      <section className="space-y-2" aria-label="Pistas">
        <h4 className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-muted">
          Pistas
          {audio.tracks.length > 0 && (
            <span className="normal-case tracking-normal">
              {loading && <LoaderCircle className="mr-1 inline h-3 w-3 animate-spin" />}
              {ready} de {audio.tracks.length} listas
            </span>
          )}
        </h4>
        {audio.loadingTracks ? (
          <p className="text-muted">Buscando pistas…</p>
        ) : audio.tracks.length === 0 ? (
          <p className="text-muted">Esta canción no tiene pistas subidas a HarmonyHub.</p>
        ) : (
          <ul className="space-y-2.5">
            {audio.tracks.map((row) => (
              <li key={row.track.id} className="space-y-1.5 rounded-lg border border-[#30333A] p-2.5" aria-label={row.track.name}>
                <div className="flex items-center gap-1.5">
                  <span className="min-w-0 flex-1 truncate font-semibold text-white">{row.track.name}</span>
                  {row.status === 'loading' && <LoaderCircle className="h-3.5 w-3.5 animate-spin text-muted" aria-label="Cargando" />}
                  <button type="button" aria-pressed={row.muted} className={`tab-pill h-7 min-h-0 px-2 text-xs ${row.muted ? 'is-active' : ''}`} onClick={() => audio.updateTrack(row.track.id, { muted: !row.muted })}>
                    M
                  </button>
                  <button type="button" aria-pressed={row.solo} className={`tab-pill h-7 min-h-0 px-2 text-xs ${row.solo ? 'is-active' : ''}`} onClick={() => audio.updateTrack(row.track.id, { solo: !row.solo })}>
                    S
                  </button>
                </div>
                {row.status === 'error' ? (
                  <p className="flex items-start gap-1.5 text-xs text-[#F7A39A]">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {row.error}
                  </p>
                ) : (
                  <Slider label={`Volumen de ${row.track.name}`} value={row.volume} onChange={(volume) => audio.updateTrack(row.track.id, { volume })} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2" aria-label="Pad y click">
        <div className="flex items-center gap-2">
          <Waves className="h-4 w-4 text-muted" />
          <span className="flex-1 text-white">Pad{audio.pad.track ? `: ${audio.pad.track.name}` : ''}</span>
          {audio.pad.status === 'error' ? (
            <span className="text-xs text-[#F7A39A]">No se pudo decodificar</span>
          ) : (
            <button type="button" className="btn-ghost h-8 px-3 text-xs" disabled={audio.pad.status !== 'ready'} onClick={audio.pad.playing ? () => audio.pad.stop() : audio.pad.start}>
              {audio.pad.playing ? 'Detener pad' : 'Iniciar pad'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 text-center font-bold text-muted">♩</span>
          <span className="flex-1 text-white">
            Click {audio.click.bpm ?? 120} BPM · {audio.click.timeSignature || '4/4'}
          </span>
          <button type="button" className="btn-ghost h-8 px-3 text-xs" onClick={audio.click.running ? audio.click.stop : audio.click.start}>
            {audio.click.running ? 'Detener click' : 'Iniciar click'}
          </button>
        </div>
      </section>
    </div>
  );
}
