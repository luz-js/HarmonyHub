import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SharedSetlist } from '../../shared/types';
import { SharedSetlistError } from './sharedSetlist.client';
import { SharedSetlistPage } from './SharedSetlistPage';

const setlist: SharedSetlist = {
  name: 'Domingo 8',
  eventStartsAt: '2026-11-08T14:00:00.000Z',
  items: [
    {
      order: 1,
      type: 'SONG',
      title: 'Sublime gracia',
      artist: 'John Newton',
      key: 'D',
      originalKey: 'C',
      content: { version: 1, sections: [{ id: 's0', type: 'VERSE', name: 'Verso 1', order: 0, lines: [{ id: 'l0', order: 0, chords: 'C   G', lyrics: 'Sublime gracia del Señor' }] }] },
    },
    { order: 2, type: 'PRAYER', title: 'Oración', artist: null, key: null, originalKey: null, content: null },
  ],
};

async function renderPage(load: (token: string) => Promise<SharedSetlist>) {
  await act(async () => {
    render(<SharedSetlistPage token="tok" load={load} />);
  });
}

describe('SharedSetlistPage', () => {
  it('muestra nombre, fecha, orden y letra con acordes en la tonalidad del setlist', async () => {
    const load = vi.fn().mockResolvedValue(setlist);
    await renderPage(load);
    expect(load).toHaveBeenCalledWith('tok');
    expect(screen.getByRole('heading', { level: 1, name: 'Domingo 8' })).toBeInTheDocument();
    expect(screen.getByText(/noviembre de 2026/)).toBeInTheDocument();
    const order = screen.getByRole('navigation', { name: 'Orden del setlist' });
    expect(within(order).getAllByRole('listitem').map((row) => row.textContent)).toEqual(['1.Sublime gracia· D', '2.Oración']);

    const song = screen.getByRole('article', { name: 'Sublime gracia' });
    expect(within(song).getByLabelText('Tonalidad')).toHaveTextContent('D');
    expect(within(song).getByText('D   A', { normalizer: (text) => text })).toBeInTheDocument();
    expect(within(song).getByText('Sublime gracia del Señor')).toBeInTheDocument();
  });

  it('subir y bajar medio tono cambia los acordes solo en este navegador', async () => {
    await renderPage(vi.fn().mockResolvedValue(setlist));
    const song = screen.getByRole('article', { name: 'Sublime gracia' });
    fireEvent.click(within(song).getByRole('button', { name: 'Subir medio tono' }));
    fireEvent.click(within(song).getByRole('button', { name: 'Subir medio tono' }));
    expect(within(song).getByLabelText('Tonalidad')).toHaveTextContent('E');
    expect(within(song).getByText('E   B', { normalizer: (text) => text })).toBeInTheDocument();
    fireEvent.click(within(song).getByRole('button', { name: 'Volver a la tonalidad del setlist' }));
    expect(within(song).getByLabelText('Tonalidad')).toHaveTextContent('D');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar acordes' }));
    expect(within(song).queryByText('D   A', { normalizer: (text) => text })).not.toBeInTheDocument();
  });

  it('no se indexa mientras esta abierta', async () => {
    await renderPage(vi.fn().mockResolvedValue(setlist));
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
    expect(document.head.querySelector('meta[name="referrer"]')?.getAttribute('content')).toBe('no-referrer');
  });

  it('enlace vencido, revocado o inventado: aviso claro y nada del setlist', async () => {
    await renderPage(vi.fn().mockRejectedValue(new SharedSetlistError(404)));
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('No se puede abrir este setlist');
    expect(alert).toHaveTextContent('ya no está disponible');
    expect(alert).toHaveTextContent('pídele un enlace nuevo');
  });
});
