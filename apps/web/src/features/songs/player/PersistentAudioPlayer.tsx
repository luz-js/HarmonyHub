import { LoaderCircle, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import { formatAudioTime, trackTypeLabels } from '../components/tracks/track.utils';
import { useAudioPlayer } from './AudioPlayerProvider';

function AudioProgressBar({ currentTime, duration, onSeek }: { currentTime: number; duration: number; onSeek: (value: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 text-right text-[11px] text-muted">{formatAudioTime(currentTime)}</span>
      <input
        aria-label="Posición de reproducción"
        className="h-1.5 flex-1 cursor-pointer accent-primary"
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(currentTime, duration || 0)}
        onChange={(event) => onSeek(Number(event.target.value))}
      />
      <span className="w-12 text-[11px] text-muted">{formatAudioTime(duration)}</span>
    </div>
  );
}

function VolumeControl({ volume, muted, onVolumeChange, onToggleMute }: { volume: number; muted: boolean; onVolumeChange: (value: number) => void; onToggleMute: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" className="btn-ghost h-9 w-9 p-0" aria-label={muted ? 'Activar audio' : 'Silenciar'} onClick={onToggleMute}>
        {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
      <input
        aria-label="Volumen"
        className="h-1.5 w-24 cursor-pointer accent-primary"
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={muted ? 0 : volume}
        onChange={(event) => onVolumeChange(Number(event.target.value))}
      />
    </div>
  );
}

/** Mini-reproductor persistente, montado una sola vez en la raiz de la app (ver App.tsx). */
export function PersistentAudioPlayer() {
  const {
    currentTrack,
    currentTrackMeta,
    currentTime,
    duration,
    isPlaying,
    isLoading,
    playbackRate,
    volume,
    muted,
    error,
    hasNext,
    hasPrevious,
    pause,
    playTrack,
    playNext,
    playPrevious,
    seek,
    setPlaybackRate,
    setVolume,
    stop,
    toggleMute,
    togglePlay,
  } = useAudioPlayer();

  if (!currentTrack) return null;

  return (
    <section className="fixed inset-x-0 bottom-4 z-30 mx-4 rounded-2xl border border-[#3D4048] bg-[#141518]/95 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur lg:inset-x-auto lg:left-1/2 lg:w-[min(960px,calc(100vw-2rem))] lg:-translate-x-1/2">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-3 lg:w-[340px]">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#3D4048] bg-[#23252A] text-[#8FB4FF] disabled:opacity-40"
            onClick={playPrevious}
            disabled={!hasPrevious}
            aria-label="Pista anterior"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#3D4048] bg-[#23252A] text-primary"
            onClick={() => {
              if (!currentTrack) return;
              if (isPlaying) {
                pause();
                return;
              }
              void playTrack(currentTrack);
            }}
            aria-label={isPlaying ? 'Pausar pista' : 'Reproducir pista'}
          >
            {isLoading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#3D4048] bg-[#23252A] text-[#8FB4FF] disabled:opacity-40"
            onClick={playNext}
            disabled={!hasNext}
            aria-label="Pista siguiente"
          >
            <SkipForward className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{currentTrack.name}</p>
            <p className="truncate text-xs text-muted">
              {currentTrackMeta?.songTitle ? `${currentTrackMeta.songTitle} · ` : ''}
              {currentTrack.version?.name || 'General'} · {trackTypeLabels[currentTrack.type]}
            </p>
          </div>
          <button type="button" className="btn-ghost h-9 w-9 p-0" onClick={stop} aria-label="Cerrar reproductor">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3">
          <AudioProgressBar currentTime={currentTime} duration={duration || currentTrack.durationSec || 0} onSeek={seek} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button type="button" className="btn-ghost h-9 px-3" onClick={togglePlay}>{isPlaying ? 'Pausar' : 'Reproducir'}</button>
              <select className="select h-9 py-0 text-xs" value={playbackRate} onChange={(event) => setPlaybackRate(Number(event.target.value))} aria-label="Velocidad de reproducción">
                {[0.75, 1, 1.25, 1.5].map((rate) => <option key={rate} value={rate}>{rate.toFixed(2).replace('.00', '')}x</option>)}
              </select>
            </div>
            <VolumeControl volume={volume} muted={muted} onVolumeChange={setVolume} onToggleMute={toggleMute} />
          </div>
          {error && <p className="text-xs text-[#F7A39A]">{error}</p>}
        </div>
      </div>
    </section>
  );
}
