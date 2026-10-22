import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SetlistCue, SetlistItem, SongTrack } from '../../../../shared/types';

const songTracks = vi.hoisted(() => ({ current: [] as SongTrack[] }));
vi.mock('../../../songs/hooks/useSongTracks', () => ({
  useSongTracks: (_organizationId: string, songId: string) => ({ data: songId ? songTracks.current : undefined, isLoading: false }),
}));

import { StageAudioPanel } from './StageAudioPanel';
import { DECODE_ERROR, useStageAudio } from './useStageAudio';
import { FakeAudioContext } from './testing/fakeAudioContext';

const track = (id: string, name: string, type: SongTrack['type'], content = '120'): SongTrack & { content: string } =>
  ({ id, songId: 's1', versionId: null, name, type, provider: 'UPLOAD', active: true, sortOrder: 0, volumeDefault: 1, panDefault: 0, isPrimary: false, url: '', createdAt: '', updatedAt: '', content }) as SongTrack & { content: string };

const item = (id: string, bpm: number | null = 90): SetlistItem =>
  ({ id, type: 'SONG', title: `Canción ${id}`, songId: 's1', songVersionId: 'v1', effective: { key: 'G', bpm, durationSec: null, capo: null }, song: { id: 's1', title: 'x', artist: 'y', coverUrl: null, timeSignature: '3/4' } }) as unknown as SetlistItem;

const cue = (id: string, type: SetlistCue['type'], setlistItemId: string | null = 'i1') => ({ id, type, setlistItemId }) as SetlistCue;

let context: FakeAudioContext;
const deps = {
  createContext: () => context,
  loadTrack: async (row: SongTrack) => new Blob([(row as SongTrack & { content: string }).content]),
};

function Harness({ currentItem, currentCue }: { currentItem: SetlistItem; currentCue: SetlistCue | null }) {
  const audio = useStageAudio({ organizationId: 'o1', enabled: true, item: currentItem, currentCue, deps });
  return <StageAudioPanel audio={audio} currentCue={currentCue} />;
}

async function armed(currentCue: SetlistCue | null = null) {
  const view = render(<Harness currentItem={item('i1')} currentCue={currentCue} />);
  await act(async () => fireEvent.click(screen.getByRole('button', { name: /Activar audio/ })));
  await waitFor(() => expect(screen.queryByLabelText('Cargando')).not.toBeInTheDocument());
  return view;
}

beforeEach(() => {
  context = new FakeAudioContext();
  // Blob.arrayBuffer en jsdom: se lee el texto (la "duracion" del archivo falso).
  songTracks.current = [track('t1', 'Batería', 'DRUMS', '120'), track('t2', 'Bajo', 'BASS', '100'), track('t3', 'Mezcla', 'FULL_TRACK', '120'), track('p1', 'Pad G', 'PAD', '60')];
});
afterEach(() => vi.useRealTimers());

describe('StageAudioPanel', () => {
  it('nada suena hasta "Activar audio" (politica de autoplay); despues carga y decodifica las pistas', async () => {
    render(<Harness currentItem={item('i1')} currentCue={null} />);
    expect(screen.getByText(/suena solo en este dispositivo/)).toBeInTheDocument();
    expect(context.state).toBe('suspended');

    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Activar audio/ })));
    expect(context.state).toBe('running');
    expect(await screen.findByText('3 de 3 listas')).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: 'Batería' })).toBeInTheDocument();
    expect(screen.queryByRole('listitem', { name: 'Pad G' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('listitem', { name: 'Mezcla' })).getByRole('button', { name: 'M' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Iniciar pad' })).toBeEnabled();
    expect(screen.getByText('Click 90 BPM · 3/4')).toBeInTheDocument();
  });

  it('avisa si un formato no se puede decodificar, y las demas siguen', async () => {
    songTracks.current = [track('t1', 'Batería', 'DRUMS'), track('t9', 'Raro', 'OTHER', 'mal formato')];
    await armed();
    expect(within(screen.getByRole('listitem', { name: 'Raro' })).getByText(DECODE_ERROR)).toBeInTheDocument();
    expect(screen.getByText('1 de 2 listas')).toBeInTheDocument();
  });

  it('play arranca todas las pistas sincronizadas; pausa y detener', async () => {
    await armed();
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir pistas' }));
    const started = context.sources.filter((source) => source.started);
    expect(started).toHaveLength(3);
    expect(new Set(started.map((source) => source.started!.when)).size).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Pausar pistas' }));
    expect(started.every((source) => source.stopped)).toBe(true);
    expect(screen.getByRole('button', { name: 'Reproducir pistas' })).toBeInTheDocument();
  });

  it('mute y solo cambian la mezcla', async () => {
    await armed();
    const drums = screen.getByRole('listitem', { name: 'Batería' });
    fireEvent.click(within(drums).getByRole('button', { name: 'S' }));
    expect(within(drums).getByRole('button', { name: 'S' })).toHaveAttribute('aria-pressed', 'true');
    // pistas ordenadas por nombre: [Bajo, Batería, Mezcla]
    expect(context.gains.slice(-3).map((gain) => gain.gain.value)).toEqual([0, 1, 0]);
    fireEvent.click(within(drums).getByRole('button', { name: 'M' }));
    expect(context.gains.slice(-3).map((gain) => gain.gain.value)).toEqual([1, 0, 0]);
  });

  it('los cues del item actual disparan click, pad y pistas; los de otro item no', async () => {
    const view = await armed(cue('c0', 'COUNT_IN'));
    view.rerender(<Harness currentItem={item('i1')} currentCue={cue('c1', 'CLICK_START')} />);
    expect(screen.getByRole('button', { name: 'Detener click' })).toBeInTheDocument();
    expect(context.oscillators.length).toBeGreaterThan(0);

    view.rerender(<Harness currentItem={item('i1')} currentCue={cue('c2', 'PAD_START')} />);
    expect(screen.getByRole('button', { name: 'Detener pad' })).toBeInTheDocument();
    expect(context.sources.some((source) => source.loop && source.started)).toBe(true);

    view.rerender(<Harness currentItem={item('i1')} currentCue={cue('c3', 'TRACK_START')} />);
    expect(screen.getByRole('button', { name: 'Pausar pistas' })).toBeInTheDocument();

    view.rerender(<Harness currentItem={item('i1')} currentCue={cue('c4', 'CLICK_STOP')} />);
    expect(screen.getByRole('button', { name: 'Iniciar click' })).toBeInTheDocument();

    view.rerender(<Harness currentItem={item('i1')} currentCue={cue('c5', 'PAD_START', 'otro-item')} />);
    expect(screen.getByRole('button', { name: 'Detener pad' })).toBeInTheDocument();

    view.rerender(<Harness currentItem={item('i1')} currentCue={cue('c6', 'TRACK_STOP')} />);
    expect(screen.getByRole('button', { name: 'Reproducir pistas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Disparar cue/ })).toBeInTheDocument();
  });

  it('al activar no se dispara el cue en el que ya estaba', async () => {
    await armed(cue('c1', 'TRACK_START'));
    expect(context.sources.filter((source) => source.started)).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: /Disparar cue/ }));
    expect(screen.getByRole('button', { name: 'Pausar pistas' })).toBeInTheDocument();
  });

  it('al cambiar de cancion lo que suena sale con fundido y "Detener todo" corta todo', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const view = await armed();
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir pistas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar click' }));
    view.rerender(<Harness currentItem={item('i2')} currentCue={null} />);
    const master = context.gains[0].gain;
    expect(master.events.some((event) => event.type === 'ramp' && event.value === 0)).toBe(true);
    expect(screen.getByRole('button', { name: 'Iniciar click' })).toBeInTheDocument();

    await waitFor(() => expect(screen.queryByLabelText('Cargando')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir pistas' }));
    fireEvent.click(screen.getByRole('button', { name: /Detener todo/ }));
    expect(screen.getByRole('button', { name: 'Reproducir pistas' })).toBeInTheDocument();
  });

  it('sin pistas subidas lo dice', async () => {
    songTracks.current = [];
    await armed();
    expect(screen.getByText('Esta canción no tiene pistas subidas a HarmonyHub.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar pad' })).toBeDisabled();
  });
});
