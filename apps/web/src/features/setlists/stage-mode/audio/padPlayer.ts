import type { AudioBufferLike, AudioContextLike, BufferSourceLike, GainNodeLike } from './audioTypes';

export const PAD_FADE_IN_SEC = 2;
export const PAD_FADE_OUT_SEC = 2;

/** Pad: una pista que suena en loop, entra y sale con fundido. */
export class PadPlayer {
  private readonly gain: GainNodeLike;
  private source: BufferSourceLike | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private volume = 0.8;

  constructor(private readonly context: AudioContextLike, output = context.destination) {
    this.gain = context.createGain();
    this.gain.gain.value = 0;
    this.gain.connect(output);
  }

  get isPlaying() {
    return this.source !== null;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.isPlaying) this.gain.gain.setValueAtTime(this.volume, this.context.currentTime);
  }

  start(buffer: AudioBufferLike, fadeInSec = PAD_FADE_IN_SEC) {
    this.stopNow();
    const now = this.context.currentTime;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.gain);
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(0, now);
    this.gain.gain.linearRampToValueAtTime(this.volume, now + fadeInSec);
    source.start(now);
    this.source = source;
  }

  /** Sale con fundido y despues se detiene. */
  stop(fadeOutSec = PAD_FADE_OUT_SEC) {
    if (!this.source) return;
    const now = this.context.currentTime;
    const source = this.source;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(0, now + fadeOutSec);
    this.source = null;
    this.clearTimer();
    this.stopTimer = setTimeout(() => {
      try {
        source.stop();
      } catch {
        // ya estaba detenida
      }
      source.disconnect();
    }, fadeOutSec * 1000);
  }

  dispose() {
    this.stopNow();
    this.gain.disconnect();
  }

  private stopNow() {
    this.clearTimer();
    if (!this.source) return;
    try {
      this.source.stop();
    } catch {
      // ya estaba detenida
    }
    this.source.disconnect();
    this.source = null;
  }

  private clearTimer() {
    if (this.stopTimer) clearTimeout(this.stopTimer);
    this.stopTimer = null;
  }
}
