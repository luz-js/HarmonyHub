import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SongTrack } from '../../../../shared/types';
import { cueAudioAction, playableTracks, shouldTriggerCue, splitTracks, startsMuted } from './cueAudio';
import { beatsPerBar, clickTimes, Metronome, validBpm } from './metronome';
import { effectiveGains, FADE_SEC, MultitrackPlayer, planSynchronizedStart, START_LEAD_SEC } from './multitrack';
import { PadPlayer } from './padPlayer';
import { FakeAudioContext, fakeBuffer } from './testing/fakeAudioContext';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('mezcla: volumen, mute y solo', () => {
  const track = (id: string, extra: Partial<{ volume: number; muted: boolean; solo: boolean }> = {}) => ({ id, volume: 0.8, muted: false, solo: false, ...extra });

  it('sin solo, suena todo lo que no esta silenciado', () => {
    expect([...effectiveGains([track('a'), track('b', { muted: true })])]).toEqual([['a', 0.8], ['b', 0]]);
  });

  it('con solo, suenan solo las pistas en solo', () => {
    expect([...effectiveGains([track('a', { solo: true }), track('b'), track('c', { solo: true, volume: 0.5 })])]).toEqual([['a', 0.8], ['b', 0], ['c', 0.5]]);
  });

  it('silenciada gana a solo, y un solo silenciado no apaga a las demas', () => {
    expect([...effectiveGains([track('a', { solo: true, muted: true }), track('b')])]).toEqual([['a', 0], ['b', 0.8]]);
  });

  it('el volumen queda entre 0 y 1', () => {
    expect(effectiveGains([track('a', { volume: 3 }), track('b', { volume: -1 })]).get('a')).toBe(1);
  });
});

describe('arranque sincronizado', () => {
  it('todas las pistas arrancan en el mismo instante del AudioContext, un poco adelante', () => {
    expect(planSynchronizedStart(5, 0, 120)).toEqual({ when: 5 + START_LEAD_SEC, offset: 0 });
    expect(planSynchronizedStart(5, 200, 120).offset).toBeLessThan(120);
    expect(planSynchronizedStart(5, -3, 120).offset).toBe(0);
  });

  it('el reproductor programa todas las fuentes con el mismo when y offset', () => {
    const context = new FakeAudioContext();
    const player = new MultitrackPlayer(context);
    player.load([{ id: 'a', buffer: fakeBuffer(100) }, { id: 'b', buffer: fakeBuffer(100) }, { id: 'c', buffer: fakeBuffer(100) }]);
    context.currentTime = 2;
    player.seek(30);
    player.play();
    expect(context.sources.map((source) => source.started)).toEqual([0, 1, 2].map(() => ({ when: 2 + START_LEAD_SEC, offset: 30 })));
    expect(player.isPlaying).toBe(true);
  });

  it('pausa recuerda la posicion y al seguir arranca desde ahi', () => {
    const context = new FakeAudioContext();
    const player = new MultitrackPlayer(context);
    player.load([{ id: 'a', buffer: fakeBuffer(100) }]);
    player.play();
    context.currentTime = START_LEAD_SEC + 12;
    expect(player.position).toBeCloseTo(12);
    player.pause();
    expect(context.sources[0].stopped).toBe(true);
    context.currentTime = 50;
    expect(player.position).toBeCloseTo(12);
    player.play();
    expect(context.sources[1].started).toEqual({ when: 50 + START_LEAD_SEC, offset: expect.closeTo(12) });
  });

  it('una pista mas corta que la posicion no se arranca (y detener no falla)', () => {
    const context = new FakeAudioContext();
    const player = new MultitrackPlayer(context);
    player.load([{ id: 'largo', buffer: fakeBuffer(100) }, { id: 'corto', buffer: fakeBuffer(10) }]);
    player.seek(20);
    player.play();
    expect(context.sources[1].started).toBeNull();
    expect(() => player.stop()).not.toThrow();
    expect(player.position).toBe(0);
  });

  it('aplica la mezcla en la ganancia de cada pista', () => {
    const context = new FakeAudioContext();
    const player = new MultitrackPlayer(context);
    player.load([{ id: 'a', buffer: fakeBuffer(10) }, { id: 'b', buffer: fakeBuffer(10) }]);
    player.applyMix([{ id: 'a', volume: 0.5, muted: false, solo: false }, { id: 'b', volume: 1, muted: true, solo: false }]);
    const [, gainA, gainB] = context.gains; // el primero es el maestro
    expect([gainA.gain.value, gainB.gain.value]).toEqual([0.5, 0]);
  });

  it('fundido: baja el maestro y detiene al terminar', () => {
    const context = new FakeAudioContext();
    const player = new MultitrackPlayer(context);
    player.load([{ id: 'a', buffer: fakeBuffer(100) }]);
    player.play();
    player.fadeOutAndStop(FADE_SEC, 0.9);
    const master = context.gains[0].gain;
    expect(master.events.at(-1)).toEqual({ type: 'ramp', value: 0, time: FADE_SEC });
    expect(player.isPlaying).toBe(true);
    vi.advanceTimersByTime(FADE_SEC * 1000);
    expect(player.isPlaying).toBe(false);
    expect(master.value).toBe(0.9);
  });
});

describe('metronomo', () => {
  it('compas y tempo', () => {
    expect(beatsPerBar('6/8')).toBe(6);
    expect(beatsPerBar('3/4')).toBe(3);
    expect(beatsPerBar(null)).toBe(4);
    expect(beatsPerBar('raro')).toBe(4);
    expect(validBpm(72)).toBe(72);
    expect(validBpm(null)).toBe(120);
    expect(validBpm(900)).toBe(120);
  });

  it('golpes cada 60/bpm, acento en el primero de cada compas', () => {
    const clicks = clickTimes(10, 120, 3, 10, 12.01);
    expect(clicks.map((click) => [click.time, click.accent])).toEqual([[10, true], [10.5, false], [11, false], [11.5, true], [12, false]]);
    expect(clickTimes(10, 120, 4, 10.6, 11.1).map((click) => click.time)).toEqual([11]);
  });

  it('programa osciladores por adelantado y deja de hacerlo al detenerse', () => {
    const context = new FakeAudioContext();
    const metronome = new Metronome(context);
    metronome.start({ bpm: 120, timeSignature: '4/4' });
    expect(context.oscillators).toHaveLength(1);
    expect(context.oscillators[0].frequency.value).toBe(1600);
    context.currentTime = 1;
    vi.advanceTimersByTime(25);
    expect(context.oscillators.map((oscillator) => oscillator.startedAt)).toEqual([0.05, 0.55, 1.05]);
    expect(context.oscillators[1].frequency.value).toBe(1000);
    metronome.stop();
    context.currentTime = 5;
    vi.advanceTimersByTime(1000);
    expect(context.oscillators).toHaveLength(3);
    expect(metronome.isRunning).toBe(false);
  });
});

describe('pad', () => {
  it('suena en loop, entra y sale con fundido', () => {
    const context = new FakeAudioContext();
    const pad = new PadPlayer(context);
    pad.start(fakeBuffer(30), 2);
    const source = context.sources[0];
    expect(source.loop).toBe(true);
    expect(context.gains[0].gain.events.at(-1)).toEqual({ type: 'ramp', value: 0.8, time: 2 });
    context.currentTime = 10;
    pad.stop(2);
    expect(context.gains[0].gain.events.at(-1)).toEqual({ type: 'ramp', value: 0, time: 12 });
    expect(source.stopped).toBe(false);
    vi.advanceTimersByTime(2000);
    expect(source.stopped).toBe(true);
    expect(pad.isPlaying).toBe(false);
  });
});

describe('cues de audio', () => {
  it('cada cue de audio tiene su accion; los demas no hacen nada', () => {
    expect(cueAudioAction('CLICK_START')).toBe('click-start');
    expect(cueAudioAction('CLICK_STOP')).toBe('click-stop');
    expect(cueAudioAction('PAD_START')).toBe('pad-start');
    expect(cueAudioAction('PAD_STOP')).toBe('pad-stop');
    expect(cueAudioAction('TRACK_START')).toBe('tracks-start');
    expect(cueAudioAction('TRACK_STOP')).toBe('tracks-stop');
    expect(cueAudioAction('LIGHTS_SCENE')).toBeNull();
  });

  it('solo dispara si el audio esta activado y el cue es del item actual (o general)', () => {
    const cue = { type: 'TRACK_START' as const, setlistItemId: 'i1' };
    expect(shouldTriggerCue(cue, 'i1', true)).toBe('tracks-start');
    expect(shouldTriggerCue(cue, 'i1', false)).toBeNull();
    expect(shouldTriggerCue(cue, 'i2', true)).toBeNull();
    expect(shouldTriggerCue({ ...cue, setlistItemId: null }, 'i2', true)).toBe('tracks-start');
    expect(shouldTriggerCue(null, 'i1', true)).toBeNull();
  });

  it('pistas: sin externas ni inactivas, el pad aparte y la mezcla completa silenciada si hay stems', () => {
    const track = (id: string, type: SongTrack['type'], extra: Partial<SongTrack> = {}) => ({ id, name: id, type, active: true, provider: 'UPLOAD', sortOrder: 0, ...extra }) as SongTrack;
    const tracks = [track('drums', 'DRUMS'), track('pad', 'PAD'), track('yt', 'REFERENCE', { provider: 'EXTERNAL_URL' }), track('old', 'BASS', { active: false }), track('mix', 'FULL_TRACK')];
    expect(playableTracks(tracks).map((row) => row.id)).toEqual(['drums', 'mix', 'pad']);
    const { pad, stems } = splitTracks(tracks);
    expect(pad?.id).toBe('pad');
    expect(stems.map((row) => row.id)).toEqual(['drums', 'mix']);
    expect(startsMuted(track('mix', 'FULL_TRACK'), 2)).toBe(true);
    expect(startsMuted(track('mix', 'FULL_TRACK'), 1)).toBe(false);
    expect(startsMuted(track('drums', 'DRUMS'), 2)).toBe(false);
  });
});
