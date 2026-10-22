import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SetlistDetail, SongSummary } from '../../../../shared/types';
import { SetlistSheet } from '../../../print/SetlistSheet';
import { loadSetlistPrintData } from '../../../print/setlistPrintData';
import type { SongContent } from '../../types/song-content.types';
import { SongExportButtons } from '../export/SongExportButtons';
import { ImportChordProDialog } from './ImportChordProDialog';

vi.mock('../../api/song-import.client', () => ({ importChordPro: vi.fn() }));
vi.mock('../../../../shared/utils/download', async (original) => ({ ...(await original<object>()), saveBlob: vi.fn() }));

import { saveBlob } from '../../../../shared/utils/download';
import { importChordPro } from '../../api/song-import.client';

const CHORDPRO = '{title: Sublime Gracia}\n{key: G}\n{capo: 2}\n\n{sov}\n[G]Sublime [C]gracia\n{eov}';
const songs = [{ id: 's1', title: 'Cuan grande es El', artist: 'Tradicional' }] as SongSummary[];

describe('ImportChordProDialog: vista previa antes de guardar', () => {
  beforeEach(() => {
    vi.mocked(importChordPro).mockReset().mockResolvedValue({ song: { id: 'nueva', title: 'Sublime Gracia' }, version: { id: 'v1', name: 'Original' }, warnings: [] });
  });

  it('muestra secciones, acordes y avisos; pide lo que falta antes de crear la canción', async () => {
    const onImported = vi.fn();
    render(<ImportChordProDialog songs={songs} onClose={vi.fn()} onImported={onImported} />);
    fireEvent.change(screen.getByLabelText('Texto ChordPro'), { target: { value: CHORDPRO } });

    const preview = screen.getByRole('region', { name: 'Vista previa' });
    expect(within(preview).getByText('Verso 1')).toBeInTheDocument();
    // Los acordes van alineados por columna: se comparan sin colapsar los espacios.
    expect(within(preview).getByText('G       C', { normalizer: (text) => text })).toBeInTheDocument();
    expect(within(preview).getByText('Sublime gracia')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Avisos del import' })).toHaveTextContent('capo');

    const create = screen.getByRole('button', { name: 'Crear canción' });
    expect(create).toBeDisabled(); // falta el artista
    fireEvent.change(screen.getByLabelText('Artista'), { target: { value: 'John Newton' } });
    expect(create).toBeEnabled();
    fireEvent.click(create);
    await waitFor(() => expect(onImported).toHaveBeenCalledWith('nueva'));
    expect(importChordPro).toHaveBeenCalledWith({ text: CHORDPRO, title: null, artist: 'John Newton', key: null });
  });

  it('como versión nueva hay que elegir la canción', async () => {
    render(<ImportChordProDialog songs={songs} onClose={vi.fn()} onImported={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Texto ChordPro'), { target: { value: CHORDPRO } });
    fireEvent.click(screen.getByLabelText('Versión nueva de una canción existente'));
    const create = screen.getByRole('button', { name: 'Crear versión' });
    expect(create).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Canción'), { target: { value: 's1' } });
    fireEvent.click(create);
    await waitFor(() => expect(importChordPro).toHaveBeenCalledWith({ text: CHORDPRO, songId: 's1', versionName: 'Importada de ChordPro', key: null }));
  });

  it('un error de la API se muestra sin cerrar el diálogo', async () => {
    vi.mocked(importChordPro).mockRejectedValueOnce(new Error('No tienes permiso para hacer esto'));
    render(<ImportChordProDialog songs={songs} onClose={vi.fn()} onImported={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Texto ChordPro'), { target: { value: `${CHORDPRO}\n{artist: X}` } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear canción' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No tienes permiso para hacer esto');
  });
});

const content: SongContent = {
  version: 1,
  sections: [{ id: 's', type: 'VERSE', name: 'Verso 1', order: 0, lines: [{ id: 'l', order: 0, chords: 'G       C', lyrics: 'Sublime gracia' }] }],
};

describe('Exportar una canción', () => {
  it('ChordPro descarga un .cho con las directivas y los acordes en línea', async () => {
    render(<SongExportButtons title="Sublime Gracia" artist="John Newton" bpm={72} timeSignature="3/4" versionKey="G" versionContent={content} viewKey="G" viewContent={content} />);
    fireEvent.click(screen.getByRole('button', { name: /ChordPro/ }));
    const [blob, name] = vi.mocked(saveBlob).mock.calls.at(-1)!;
    expect(name).toBe('sublime-gracia.cho');
    const text = await blob.text();
    expect(text).toContain('{title: Sublime Gracia}');
    expect(text).toContain('{key: G}');
    expect(text).toContain('[G]Sublime [C]gracia');
  });

  it('PDF abre el diálogo de impresión con lo que se está viendo (también transportado)', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const transposed: SongContent = { ...content, sections: [{ ...content.sections[0], lines: [{ id: 'l', order: 0, chords: 'A       D', lyrics: 'Sublime gracia' }] }] };
    render(<SongExportButtons title="Sublime Gracia" versionKey="G" versionContent={content} viewKey="A" viewContent={transposed} />);
    fireEvent.click(screen.getByRole('button', { name: /PDF/ }));
    const sheet = document.querySelector('.print-sheet')!;
    expect(sheet).toHaveTextContent('Tonalidad: A');
    expect(sheet.querySelector('.print-chords')?.textContent).toBe('A       D');
    return waitFor(() => expect(print).toHaveBeenCalled());
  });
});

describe('PDF del setlist', () => {
  const setlist = {
    id: 'l1',
    name: 'Domingo',
    description: null,
    status: 'PUBLISHED',
    isTemplate: false,
    estimatedSec: 0,
    itemCount: 3,
    createdAt: '',
    updatedAt: '',
    items: [
      { id: 'i1', type: 'SONG', title: 'Sublime Gracia', order: 1, songId: 's1', songVersionId: 'v1', isHidden: false, effective: { key: 'A', bpm: 72, durationSec: null, capo: null }, song: { id: 's1', title: 'Sublime Gracia', artist: 'John Newton', coverUrl: null } },
      { id: 'i2', type: 'PRAYER', title: 'Oración', order: 2, songId: null, songVersionId: null, isHidden: false, effective: { key: null, bpm: null, durationSec: null, capo: null } },
      { id: 'i3', type: 'SONG', title: 'Oculta', order: 3, songId: 's2', songVersionId: 'v2', isHidden: true, effective: { key: 'C', bpm: null, durationSec: null, capo: null } },
    ],
  } as unknown as SetlistDetail;

  it('transporta cada canción a la tonalidad del setlist y deja afuera los items ocultos', async () => {
    const fetchVersion = vi.fn(async () => ({ id: 'v1', songId: 's1', name: 'Original', key: 'G', isDefault: true, contentJson: content }));
    const data = await loadSetlistPrintData(setlist, fetchVersion as never);
    expect(fetchVersion).toHaveBeenCalledTimes(1);
    expect(data.songs[0].sheet.keyLabel).toBe('A');
    expect(data.songs[0].sheet.content.sections[0].lines[0].chords).toBe('A       D');

    render(<SetlistSheet setlist={setlist} data={data} printedAt={new Date(2026, 9, 25)} />);
    const order = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(order).toEqual(['Sublime GraciaA · John Newton', 'Oración']);
  });
});
