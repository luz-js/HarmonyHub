import type { AudioBufferLike, AudioContextLike, BufferSourceLike, GainNodeLike } from './audioTypes';

/** Margen para que todas las pistas arranquen juntas: se programan para "ahora + esto", no "ya". */
export const START_LEAD_SEC = 0.1;
/** Fundido al detener o cambiar de cancion. */
export const FADE_SEC = 0.6;

export type MixTrack = { id: string; volume: number; muted: boolean; solo: boolean };

/**
 * Volumen efectivo de cada pista: si alguna esta en solo, suenan solo esas; las silenciadas nunca suenan
 * (aunque esten en solo). El maestro se aplica aparte.
 */
export function effectiveGains(tracks: MixTrack[]) {
  const anySolo = tracks.some((track) => track.solo && !track.muted);
  return new Map(tracks.map((track) => [track.id, track.muted || (anySolo && !track.solo) ? 0 : Math.max(0, Math.min(1, track.volume))]));
}

/** Cuando y desde donde arrancan todas las pistas: el mismo instante del AudioContext para todas. */
export function planSynchronizedStart(currentTime: number, offsetSec: number, durationSec: number) {
  const offset = Math.max(0, Math.min(offsetSec, Math.max(0, durationSec - 0.01)));
  return { when: currentTime + START_LEAD_SEC, offset };
}

type LoadedTrack = { id: string; buffer: AudioBufferLike; gain: GainNodeLike; source: BufferSourceLike | null };

/**
 * Reproductor de stems: todas las pistas suenan juntas desde el mismo AudioContext.currentTime, cada una con su
 * ganancia (volumen/mute/solo) y un maestro. Pausar recuerda la posicion; las fuentes de Web Audio no se reusan,
 * asi que cada play crea fuentes nuevas.
 */
export class MultitrackPlayer {
  private readonly master: GainNodeLike;
  private tracks: LoadedTrack[] = [];
  private startedAt: number | null = null;
  private offset = 0;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private onEnded: (() => void) | null = null;

  constructor(private readonly context: AudioContextLike, output = context.destination) {
    this.master = context.createGain();
    this.master.connect(output);
  }

  get duration() {
    return Math.max(0, ...this.tracks.map((track) => track.buffer.duration));
  }

  get isPlaying() {
    return this.startedAt !== null;
  }

  /** Posicion actual en segundos (no pasa del final). */
  get position() {
    if (this.startedAt === null) return this.offset;
    return Math.min(this.duration, Math.max(0, this.offset + this.context.currentTime - this.startedAt));
  }

  setOnEnded(callback: (() => void) | null) {
    this.onEnded = callback;
  }

  /** Reemplaza las pistas (detiene lo que sonaba). */
  load(tracks: Array<{ id: string; buffer: AudioBufferLike }>) {
    this.stop();
    this.tracks.forEach((track) => track.gain.disconnect());
    this.tracks = tracks.map((track) => {
      const gain = this.context.createGain();
      gain.connect(this.master);
      return { ...track, gain, source: null };
    });
  }

  applyMix(mix: MixTrack[]) {
    const gains = effectiveGains(mix);
    for (const track of this.tracks) {
      const value = gains.get(track.id) ?? 1;
      track.gain.gain.cancelScheduledValues(this.context.currentTime);
      track.gain.gain.setValueAtTime(value, this.context.currentTime);
    }
  }

  setMasterVolume(volume: number) {
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), now);
  }

  play() {
    if (this.isPlaying || this.tracks.length === 0) return;
    this.clearStopTimer();
    const { when, offset } = planSynchronizedStart(this.context.currentTime, this.offset, this.duration);
    for (const track of this.tracks) {
      const source = this.context.createBufferSource();
      source.buffer = track.buffer;
      source.connect(track.gain);
      // Una pista mas corta que la posicion simplemente no suena (no se le pide un offset fuera de rango).
      if (offset < track.buffer.duration) source.start(when, offset);
      track.source = source;
    }
    const longest = this.tracks.reduce((best, track) => (track.buffer.duration > best.buffer.duration ? track : best));
    if (longest.source) {
      longest.source.onended = () => {
        if (this.startedAt === null) return;
        this.releaseSources();
        this.startedAt = null;
        this.offset = 0;
        this.onEnded?.();
      };
    }
    this.offset = offset;
    this.startedAt = when;
  }

  pause() {
    if (!this.isPlaying) return;
    const position = this.position;
    this.releaseSources();
    this.startedAt = null;
    this.offset = position;
  }

  stop() {
    this.clearStopTimer();
    this.releaseSources();
    this.startedAt = null;
    this.offset = 0;
  }

  seek(seconds: number) {
    const wasPlaying = this.isPlaying;
    this.pause();
    this.offset = Math.max(0, Math.min(seconds, this.duration));
    if (wasPlaying) this.play();
  }

  /** Baja el maestro en `seconds` y despues detiene; el maestro vuelve al volumen que tenia. */
  fadeOutAndStop(seconds = FADE_SEC, masterVolume = 1) {
    if (!this.isPlaying) {
      this.stop();
      return;
    }
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0, now + seconds);
    this.clearStopTimer();
    this.stopTimer = setTimeout(() => {
      this.stop();
      this.setMasterVolume(masterVolume);
    }, seconds * 1000);
  }

  dispose() {
    this.stop();
    this.tracks.forEach((track) => track.gain.disconnect());
    this.tracks = [];
    this.master.disconnect();
  }

  private releaseSources() {
    for (const track of this.tracks) {
      if (!track.source) continue;
      track.source.onended = null;
      try {
        track.source.stop();
      } catch {
        // Una fuente que nunca arranco (pista mas corta que la posicion) no se puede detener.
      }
      track.source.disconnect();
      track.source = null;
    }
  }

  private clearStopTimer() {
    if (this.stopTimer) clearTimeout(this.stopTimer);
    this.stopTimer = null;
  }
}
