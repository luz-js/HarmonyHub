import type { AudioBufferLike, AudioContextLike, AudioNodeLike, AudioParamLike, BufferSourceLike, GainNodeLike, OscillatorLike } from '../audioTypes';

/** AudioParam falso: guarda cada cambio programado para revisarlo en las pruebas. */
export class FakeParam implements AudioParamLike {
  events: Array<{ type: 'set' | 'ramp' | 'cancel'; value?: number; time: number }> = [];
  constructor(public value = 1) {}
  setValueAtTime(value: number, time: number) {
    this.value = value;
    this.events.push({ type: 'set', value, time });
  }
  linearRampToValueAtTime(value: number, time: number) {
    this.value = value;
    this.events.push({ type: 'ramp', value, time });
  }
  cancelScheduledValues(time: number) {
    this.events.push({ type: 'cancel', time });
  }
}

class FakeNode implements AudioNodeLike {
  connections: AudioNodeLike[] = [];
  disconnected = false;
  connect(destination: AudioNodeLike) {
    this.connections.push(destination);
    return destination;
  }
  disconnect() {
    this.disconnected = true;
  }
}

export class FakeGain extends FakeNode implements GainNodeLike {
  gain = new FakeParam(1);
}

export class FakeSource extends FakeNode implements BufferSourceLike {
  buffer: AudioBufferLike | null = null;
  loop = false;
  onended: (() => void) | null = null;
  started: { when?: number; offset?: number } | null = null;
  stopped = false;
  start(when?: number, offset?: number) {
    this.started = { when, offset };
  }
  stop() {
    if (!this.started) throw new Error('InvalidStateError: la fuente no arranco');
    this.stopped = true;
  }
}

export class FakeOscillator extends FakeNode implements OscillatorLike {
  frequency = new FakeParam(440);
  startedAt: number | null = null;
  start(when?: number) {
    this.startedAt = when ?? 0;
  }
  stop() {}
}

export class FakeAudioContext implements AudioContextLike {
  currentTime = 0;
  state = 'suspended';
  destination = new FakeNode();
  gains: FakeGain[] = [];
  sources: FakeSource[] = [];
  oscillators: FakeOscillator[] = [];
  /** Lo que devuelve decodeAudioData: duracion por contenido (texto del ArrayBuffer), o error si empieza con "mal". */
  decode = async (data: ArrayBuffer): Promise<AudioBufferLike> => {
    const text = new TextDecoder().decode(data);
    if (text.startsWith('mal')) throw new Error('EncodingError');
    return { duration: Number(text) || 10 };
  };

  createGain() {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }
  createBufferSource() {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  }
  createOscillator() {
    const oscillator = new FakeOscillator();
    this.oscillators.push(oscillator);
    return oscillator;
  }
  decodeAudioData(data: ArrayBuffer) {
    return this.decode(data);
  }
  async resume() {
    this.state = 'running';
  }
  async close() {
    this.state = 'closed';
  }
}

export const fakeBuffer = (duration: number): AudioBufferLike => ({ duration });
