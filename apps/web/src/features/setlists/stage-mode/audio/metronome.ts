import type { AudioContextLike, GainNodeLike } from './audioTypes';

export const DEFAULT_BPM = 120;
const LOOKAHEAD_SEC = 0.12;
const TICK_MS = 25;
const CLICK_SEC = 0.03;

/** "6/8" -> 6 tiempos por compas; sin dato o raro, 4. */
export function beatsPerBar(timeSignature?: string | null) {
  const beats = Number(/^\s*(\d{1,2})\s*\/\s*\d{1,2}\s*$/.exec(timeSignature ?? '')?.[1]);
  return Number.isInteger(beats) && beats > 0 && beats <= 16 ? beats : 4;
}

export function validBpm(bpm?: number | null) {
  return bpm && bpm >= 20 && bpm <= 300 ? bpm : DEFAULT_BPM;
}

/**
 * Los golpes que caen en [from, until): cada `60/bpm` segundos desde `startTime`, el primero de cada compas
 * acentuado. Es la cuenta del metronomo (pura, se prueba sin audio).
 */
export function clickTimes(startTime: number, bpm: number, beats: number, from: number, until: number) {
  const interval = 60 / bpm;
  const first = Math.max(0, Math.ceil((from - startTime) / interval - 1e-9));
  const clicks: Array<{ time: number; beat: number; accent: boolean }> = [];
  for (let index = first; startTime + index * interval < until; index += 1) {
    const beat = index % beats;
    clicks.push({ time: startTime + index * interval, beat, accent: beat === 0 });
  }
  return clicks;
}

/**
 * Metronomo generado con Web Audio (un pitido corto por tiempo, mas agudo en el 1). Programa los golpes un poco
 * por adelantado con un temporizador, que es la forma precisa de hacerlo en el navegador.
 */
export class Metronome {
  private readonly output: GainNodeLike;
  private timer: ReturnType<typeof setInterval> | null = null;
  private startTime = 0;
  private scheduledUntil = 0;
  private bpm = DEFAULT_BPM;
  private beats = 4;

  constructor(private readonly context: AudioContextLike, output = context.destination) {
    this.output = context.createGain();
    this.output.gain.value = 0.6;
    this.output.connect(output);
  }

  get isRunning() {
    return this.timer !== null;
  }

  get settings() {
    return { bpm: this.bpm, beats: this.beats };
  }

  setVolume(volume: number) {
    this.output.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.context.currentTime);
  }

  start({ bpm, timeSignature }: { bpm?: number | null; timeSignature?: string | null }) {
    this.stop();
    this.bpm = validBpm(bpm);
    this.beats = beatsPerBar(timeSignature);
    this.startTime = this.context.currentTime + 0.05;
    this.scheduledUntil = this.startTime;
    this.schedule();
    this.timer = setInterval(() => this.schedule(), TICK_MS);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  dispose() {
    this.stop();
    this.output.disconnect();
  }

  /** Programa los golpes que faltan hasta "ahora + lookahead". */
  schedule() {
    const until = this.context.currentTime + LOOKAHEAD_SEC;
    for (const click of clickTimes(this.startTime, this.bpm, this.beats, this.scheduledUntil, until)) {
      const oscillator = this.context.createOscillator();
      const envelope = this.context.createGain();
      oscillator.frequency.setValueAtTime(click.accent ? 1600 : 1000, click.time);
      envelope.gain.setValueAtTime(1, click.time);
      envelope.gain.linearRampToValueAtTime(0, click.time + CLICK_SEC);
      oscillator.connect(envelope);
      envelope.connect(this.output);
      oscillator.start(click.time);
      oscillator.stop(click.time + CLICK_SEC);
    }
    this.scheduledUntil = Math.max(this.scheduledUntil, until);
  }
}
