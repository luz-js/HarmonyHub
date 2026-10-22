/**
 * Lo minimo de Web Audio que usa Stage Mode. Las clases reciben un AudioContext real en el navegador y uno falso
 * en las pruebas (ver testing/fakeAudioContext.ts), asi la logica se prueba sin sonido.
 */
export type AudioParamLike = {
  value: number;
  setValueAtTime(value: number, time: number): unknown;
  linearRampToValueAtTime(value: number, time: number): unknown;
  cancelScheduledValues(time: number): unknown;
};

export type AudioNodeLike = { connect(destination: AudioNodeLike): unknown; disconnect(): void };

export type GainNodeLike = AudioNodeLike & { gain: AudioParamLike };

export type AudioBufferLike = { duration: number };

export type BufferSourceLike = AudioNodeLike & {
  buffer: AudioBufferLike | null;
  loop: boolean;
  onended: (() => void) | null;
  start(when?: number, offset?: number): void;
  stop(when?: number): void;
};

export type OscillatorLike = AudioNodeLike & {
  frequency: AudioParamLike;
  start(when?: number): void;
  stop(when?: number): void;
};

export type AudioContextLike = {
  readonly currentTime: number;
  readonly state: string;
  readonly destination: AudioNodeLike;
  createGain(): GainNodeLike;
  createBufferSource(): BufferSourceLike;
  createOscillator(): OscillatorLike;
  decodeAudioData(data: ArrayBuffer): Promise<AudioBufferLike>;
  resume(): Promise<void>;
  close(): Promise<void>;
};
